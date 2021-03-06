import React from 'react';
import keys from '../../i18n';
import PropTypes from 'prop-types';
import Deposit from './Deposit';
import EthNetworkUtil from '../../utils/EthNetworkUtil';
import { getListingItemStatusStyle } from '../../utils/ListingsList';

const networkId = require('../../cfg.json').network;

const ListingHeader = ({
  listing,
  minDeposit
}) => {
  const ownerUrl = `${EthNetworkUtil.getEtherscanUrl(networkId)}/address/${listing.account}`;
  return (
    <div className='listingHeader'>
      <div>
        <h4 className='headline'>{listing.name}</h4>
        {listing.isSuspicious && (
          <span style={{...getListingItemStatusStyle(listing.status), backgroundColor: keys.errorColor}}>
            {keys.candidatePage_suspicious}
          </span>
        )}
        <p className='listingMeta'>
          <a href={ownerUrl} target='_blank'>{keys.owner}</a>
        </p>
      </div>
      {!listing.belongToAccount ? <Deposit listing={listing} minDeposit={minDeposit} /> : null}
    </div>
  );
};

ListingHeader.propTypes = {
  listing: PropTypes.object.isRequired,
  minDeposit: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default ListingHeader;
