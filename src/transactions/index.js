import BN from 'bn.js';
import TCR, {provider} from '../TCR';
import TransactionManager from './TransactionsManager';
import PromisesQueue from '../utils/PromisesQueue';
import keys from '../i18n';

export async function applyListing (hash, data, tokensAmount) {
  const account = await TCR.defaultAccount();
  const manager = new TransactionManager(provider());
  const approvedRegistryTokens = new BN((await TCR.getApprovedTokens()).registry, 10);
  tokensAmount = new BN(tokensAmount.toString(), 10);
  const queue = new PromisesQueue();

  if (approvedRegistryTokens.lt(tokensAmount)) {
    const diff = tokensAmount.sub(approvedRegistryTokens);
    queue.add(
      () => {
        return account.approveTokens(TCR.registry().address, diff)
          .then(ti => {
            return manager.watchForTransaction(ti);
          });
      },
      {
        label: keys.formatString(keys.transaction_approveTransferTokensHeader, diff.toString()),
        content: keys.formatString(keys.transaction_approveTransferTokensText, { name: 'TCR', type: 'Registry', tokenName: 'TCR' })
      }
    );
  }

  queue.add(
    async () => {
      return TCR.registry().createListing(hash, tokensAmount, data); // TODO: следить за статусом транзакции
    },
    {
      label: keys.candidatePage_transactionsSteps_applyCandidate,
      content: keys.candidatePage_transactionsSteps_applyCandidateText
    }
  );

  return queue;
}

export async function challengeListing (name, tokensAmount) {
  const registry = TCR.registry();
  const account = await TCR.defaultAccount();
  const listing = await registry.getListing(name);
  const manager = new TransactionManager(provider());
  const approvedRegistryTokens = new BN((await TCR.getApprovedTokens()).registry, 10);
  tokensAmount = new BN(tokensAmount, 10);
  const queue = new PromisesQueue();

  if (approvedRegistryTokens.lt(tokensAmount)) {
    const diff = tokensAmount.sub(approvedRegistryTokens);
    queue.add(
      () => {
        return account.approveTokens(TCR.registry().address, diff)
          .then(ti => {
            return manager.watchForTransaction(ti);
          });
      },
      {
        label: keys.formatString(keys.transaction_approveTransferTokensHeader, diff.toString()),
        content: keys.formatString(keys.transaction_approveTransferTokensText, { name: keys.registryName, type: 'Registry', tokenName: keys.tokenName })
      }
    );
  }

  // TODO: здесь оставить только данные и идентификаторы транзакций. Сами тексты унести на уровень ui-компонентов

  queue.add(
    () => listing.challenge(),
    {
      label: keys.transaction_submitChallengeHeader,
      content: keys.formatString(keys.transaction_submitChallengeText, { name: keys.registryName })
    }
  );

  return queue;
}

export async function commitVote (id, hash, stake) {
  // const registry = TCR.registry();
  const account = await TCR.defaultAccount();
  const plcr = await TCR.getPLCRVoting();
  const poll = plcr.getPoll(id);
  const manager = new TransactionManager(provider());
  const approvedPlcrTokens = new BN((await TCR.getApprovedTokens()).plcr, 10);
  stake = new BN(stake, 10);
  const votingRights = new BN((await TCR.getVotingRights()).toString());
  const queue = new PromisesQueue();

  if (votingRights.lt(stake)) {
    const preapprove = stake.sub(votingRights); // Just to buy the necessary amount

    if (approvedPlcrTokens.lt(preapprove)) {
      const diff = preapprove.sub(approvedPlcrTokens);
      queue.add(
        () => {
          return account.approveTokens(plcr.address, diff)
            .then(ti => {
              return manager.watchForTransaction(ti);
            });
        },
        {
          label: keys.formatString(keys.transaction_approveTransferTokensHeader, diff.toString()),
          content: keys.formatString(keys.transaction_approveTransferTokensText, { name: keys.registryName, type: 'PLCR', tokenName: keys.tokenName })
        }
      );
    }

    queue.add(
      () => plcr.requestVotingRights(preapprove),
      {
        label: keys.formatString(keys.transaction_requestVotingRightsHeader, preapprove.toString()),
        content: keys.transaction_requestVotingRightsText
      }
    );
  }

  // Approve tokens to PLCRVoting contract
  queue.add(
    () => poll.commitVote(hash, stake),
    {
      label: keys.transaction_commitVoteHeader,
      content: keys.transaction_commitVoteText
    }
  );

  return queue;
}

export async function revealVote (id, option, salt) {
  const plcr = await TCR.getPLCRVoting();
  const poll = plcr.getPoll(id);

  return new PromisesQueue()
  // Approve tokens to PLCRVoting contract
    .add(
      () => poll.revealVote(option, salt).catch((err) => console.log(err)),
      {
        label: keys.transaction_revealVoteHeader,
        content: keys.transaction_revealVoteText
      }
    );
}

export async function refreshListingStatus (name) {
  const registry = TCR.registry();
  const listing = await registry.getListing(name);

  return listing.updateStatus()
    .catch(error => console.error(error));
}

export async function processProposal (proposalObj) {
  const registry = TCR.registry();
  const parameterizer = await registry.getParameterizer();
  const { contractName, proposal } = proposalObj;
  const proposalInstance = parameterizer.getProposal(contractName, proposal);
  return proposalInstance.process({});
}

export async function claimReward (challengeId, salt) {
  const manager = new TransactionManager(provider());
  const challenge = TCR.registry().getChallenge(challengeId);
  const ti = await challenge.claimReward(salt);
  await manager.watchForTransaction(ti);
}

export async function proposeNewParameterizerValue (parameterName, newParameterValue) {
  const account = await TCR.defaultAccount();
  const parameterizer = await TCR.getParameterizer();
  const tokensAmount = new BN(await parameterizer.get('pMinDeposit'), 10);
  const manager = new TransactionManager(provider());
  const approvedParameterizationTokens = new BN((await TCR.getApprovedTokens()).parameterizer, 10);
  const queue = new PromisesQueue();

  if (approvedParameterizationTokens.lt(tokensAmount)) {
    const diff = tokensAmount.sub(approvedParameterizationTokens);
    queue.add(
      () => {
        return account
          .approveTokens(parameterizer.address, diff)
          .then(ti => {
            return manager.watchForTransaction(ti);
          });
      },
      {
        label: keys.formatString(
          keys.transaction_approveTransferTokensHeader,
          diff.toString()
        ),
        content: keys.formatString(
          keys.transaction_approveTransferTokensText,
          {
            name: keys.registryName,
            type: 'Parameterizer',
            tokenName: keys.tokenName
          }
        )
      }
    );
  }
  queue.add(
    () =>
      parameterizer.createProposal(
        parameterName,
        newParameterValue
      ),
    {
      label: keys.transaction_submitReparameterizationHeader,
      content: keys.transaction_submitReparameterizationText
    }
  );

  return queue;
}

export async function challengeProposalTx (proposal) {
  const account = await TCR.defaultAccount();
  const registry = TCR.registry();
  const parameterizer = await registry.getParameterizer();
  const tokensAmount = new BN(await parameterizer.get('pMinDeposit'), 10);
  const proposalInstance = parameterizer.getProposal(proposal.contractName, proposal.proposal);
  const manager = new TransactionManager(provider());
  const approvedRegistryTokens = new BN((await TCR.getApprovedTokens()).parameterizer, 10);
  const queue = new PromisesQueue();

  if (approvedRegistryTokens.lt(tokensAmount)) {
    const diff = tokensAmount.sub(approvedRegistryTokens);
    queue.add(
      () => account.approveTokens(parameterizer.address, diff).then(ti => manager.watchForTransaction(ti)),
      {
        label: keys.formatString(keys.transaction_approveTransferTokensHeader, diff.toString()),
        content: keys.formatString(keys.transaction_approveTransferTokensText, { name: keys.registryName, type: 'Registry', tokenName: keys.tokenName })
      }
    );
  }
  queue.add(
    () => proposalInstance.challenge(),
    {
      label: keys.transaction_submitChallengeHeader,
      content: keys.formatString(keys.transaction_submitChallengeText, { name: keys.registryName })
    }
  );

  return queue;
}

export async function depositListing (id, value) {
  const account = await TCR.defaultAccount();
  const manager = new TransactionManager(provider());
  const approvedRegistryTokens = new BN((await TCR.getApprovedTokens()).registry, 10);
  const listing = await TCR.registry().getListing(id);
  value = new BN(value, 10);

  const queue = new PromisesQueue();

  if (approvedRegistryTokens.lt(value)) {
    const diff = value.sub(approvedRegistryTokens);
    queue.add(
      () => {
        return account.approveTokens(TCR.registry().address, diff)
          .then(ti => {
            return manager.watchForTransaction(ti);
          });
      },
      {
        label: keys.formatString(keys.transaction_approveTransferTokensHeader, diff.toString()),
        content: keys.formatString(keys.transaction_approveTransferTokensText, { name: 'TCR', type: 'Registry', tokenName: 'TCR' })
      }
    );
  }

  queue.add(
    async () => {
      return listing.deposit(value)
        .catch(error => console.error(error));
    },
    {
      label: keys.transaction_submitDepositHeader,
      content: keys.transaction_submitDepositText
    }
  );

  return queue;
}

export async function withdrawListing (id, value) {
  const registry = TCR.registry();
  const listing = await registry.getListing(id);
  const queue = new PromisesQueue();
  queue.add(
    async () => {
      return listing.withdraw(new BN(value, 10))
        .catch(error => console.error(error));
    },
    {
      label: keys.transaction_submitDepositHeader,
      content: keys.transaction_submitDepositText
    }
  );

  return queue;
}

export async function exitListing (name) {
  const registry = TCR.registry();
  const listing = await registry.getListing(name);

  return listing.remove()
    .catch(error => console.error(error));
}
