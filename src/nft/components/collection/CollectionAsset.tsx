import { BigNumber } from '@ethersproject/bignumber'
import { sendAnalyticsEvent, useTrace } from '@uniswap/analytics'
import { EventName, PageName } from '@uniswap/analytics-events'
import { useBag } from 'nft/hooks'
import { GenieAsset, Markets, TokenType } from 'nft/types'
import { formatWeiToDecimal, rarityProviderLogo } from 'nft/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components/macro'

import { useAssetMediaType, useNotForSale } from './Card'
import { AssetMediaType } from './Card'
import * as Card from './Card'

interface CollectionAssetProps {
  asset: GenieAsset
  isMobile: boolean
  mediaShouldBePlaying: boolean
  setCurrentTokenPlayingMedia: (tokenId: string | undefined) => void
  rarityVerified?: boolean
}

const TOOLTIP_TIMEOUT = 2000

const StyledContainer = styled.div`
  position: absolute;
  bottom: 12px;
  left: 0px;
  display: flex;
  justify-content: center;
  width: 100%;
  z-index: 2;
  pointer-events: none;
`

export const CollectionAsset = ({
  asset,
  isMobile,
  mediaShouldBePlaying,
  setCurrentTokenPlayingMedia,
  rarityVerified,
}: CollectionAssetProps) => {
  const bagManuallyClosed = useBag((state) => state.bagManuallyClosed)
  const addAssetsToBag = useBag((state) => state.addAssetsToBag)
  const removeAssetsFromBag = useBag((state) => state.removeAssetsFromBag)
  const usedSweep = useBag((state) => state.usedSweep)
  const itemsInBag = useBag((state) => state.itemsInBag)
  const bagExpanded = useBag((state) => state.bagExpanded)
  const setBagExpanded = useBag((state) => state.setBagExpanded)
  const trace = useTrace({ page: PageName.NFT_COLLECTION_PAGE })

  const { isSelected } = useMemo(() => {
    const matchingItems = itemsInBag.filter(
      (item) => asset.tokenId === item.asset.tokenId && asset.address === item.asset.address
    )

    const isSelected = matchingItems.length > 0
    return {
      isSelected,
    }
  }, [asset, itemsInBag])

  const [showTooltip, setShowTooltip] = useState(false)
  const isSelectedRef = useRef(isSelected)

  const notForSale = useNotForSale(asset)
  const assetMediaType = useAssetMediaType(asset)

  const { provider, rarityLogo } = useMemo(() => {
    return {
      provider: asset?.rarity?.providers?.find(
        ({ provider: _provider }) => _provider === asset.rarity?.primaryProvider
      ),
      rarityLogo: rarityProviderLogo[asset.rarity?.primaryProvider ?? 0] ?? '',
    }
  }, [asset])

  const handleAddAssetToBag = useCallback(() => {
    if (BigNumber.from(asset.priceInfo?.ETHPrice ?? 0).gte(0)) {
      addAssetsToBag([asset])
      if (!bagExpanded && !isMobile && !bagManuallyClosed) {
        setBagExpanded({ bagExpanded: true })
      }
      sendAnalyticsEvent(EventName.NFT_BUY_ADDED, {
        collection_address: asset.address,
        token_id: asset.tokenId,
        token_type: asset.tokenType,
        ...trace,
      })
    }
  }, [addAssetsToBag, asset, bagExpanded, bagManuallyClosed, isMobile, setBagExpanded, trace])

  useEffect(() => {
    if (isSelected !== isSelectedRef.current && !usedSweep) {
      setShowTooltip(true)
      isSelectedRef.current = isSelected
      const tooltipTimer = setTimeout(() => {
        setShowTooltip(false)
      }, TOOLTIP_TIMEOUT)

      return () => {
        clearTimeout(tooltipTimer)
      }
    }
    isSelectedRef.current = isSelected
    return undefined
  }, [isSelected, isSelectedRef, usedSweep])

  const handleRemoveAssetFromBag = useCallback(() => {
    removeAssetsFromBag([asset])
  }, [asset, removeAssetsFromBag])

  return (
    <Card.Container
      asset={asset}
      selected={isSelected}
      addAssetToBag={handleAddAssetToBag}
      removeAssetFromBag={handleRemoveAssetFromBag}
    >
      <Card.ImageContainer
        selected={isSelected}
        addAssetToBag={handleAddAssetToBag}
        removeAssetFromBag={handleRemoveAssetFromBag}
        itemsInBag={itemsInBag}
      >
        {assetMediaType === AssetMediaType.Image ? (
          <Card.Image />
        ) : assetMediaType === AssetMediaType.Video ? (
          <Card.Video shouldPlay={mediaShouldBePlaying} setCurrentTokenPlayingMedia={setCurrentTokenPlayingMedia} />
        ) : (
          <Card.Audio shouldPlay={mediaShouldBePlaying} setCurrentTokenPlayingMedia={setCurrentTokenPlayingMedia} />
        )}
      </Card.ImageContainer>
      <Card.DetailsContainer>
        <Card.InfoContainer>
          <Card.PrimaryRow>
            <Card.PrimaryDetails>
              <Card.PrimaryInfo>{asset.name ? asset.name : `#${asset.tokenId}`}</Card.PrimaryInfo>
              {asset.susFlag && <Card.Suspicious />}
            </Card.PrimaryDetails>
            {asset.rarity && provider && (
              <Card.Ranking
                rarity={asset.rarity}
                provider={provider}
                rarityVerified={!!rarityVerified}
                rarityLogo={rarityLogo}
              />
            )}
          </Card.PrimaryRow>
          <Card.SecondaryRow>
            <Card.SecondaryDetails>
              <Card.SecondaryInfo>
                {notForSale ? '' : `${formatWeiToDecimal(asset.priceInfo.ETHPrice, true)} ETH`}
              </Card.SecondaryInfo>
              {(asset.marketplace === Markets.NFTX || asset.marketplace === Markets.NFT20) && <Card.Pool />}
            </Card.SecondaryDetails>
            {asset.tokenType !== TokenType.ERC1155 && asset.marketplace && (
              <Card.MarketplaceIcon marketplace={asset.marketplace} />
            )}
          </Card.SecondaryRow>
        </Card.InfoContainer>
      </Card.DetailsContainer>
    </Card.Container>
  )
}
