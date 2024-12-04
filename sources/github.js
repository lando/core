'use strict';

// Modules
const _ = require('lodash');
const fs = require('fs');
const getOctokit = require('../utils/get-octokit');
const os = require('os');
const path = require('path');

// Github
const githubTokenCache = 'github.tokens';
const gitHubLandoKey = 'github.lando.id_rsa';
const gitHubLandoKeyComment = 'lando@' + os.hostname();
let gitHubRepos = [];

// Helper to sort tokens
const sortTokens = (...sources) => _(_.flatten([...sources]))
  .sortBy('date')
  .groupBy('user')
  .map(tokens => _.last(tokens))
  .value();

// Helper to get github tokens
const getTokens = tokens => _(tokens)
  .map(token => ({name: token.user, value: token.token}))
  .value();

// Helper to parse tokens into choices
const parseTokens = tokens => _.flatten([getTokens(tokens), [{name: 'add or refresh a token', value: 'more'}]]);

// Helper to post a github ssh key
const postKey = (keyDir, token, id) => {
  const octokit = getOctokit({auth: token});
  return octokit.users.createPublicSshKeyForAuthenticatedUser({
    title: id,
    key: _.trim(fs.readFileSync(path.join(keyDir, `${gitHubLandoKey}.pub`), 'utf8')),
  })
  .catch(gerror => {
    // we can ignore 422 - key is already in use errors
    if (gerror.status === 422 && _.get(gerror, 'response.data.errors[0].message') === 'key is already in use') {
      return Promise.resolve();
    }

    // otherwise return original error
    const error = new Error(`Could not post key! [${gerror.status}] ${gerror.message}`);
    error.code = gerror.status;
    error.stack = JSON.stringify(gerror);
    return Promise.reject(error);
  });
};

// Helper to set caches
const setCaches = (options, lando) => {
  const octokit = getOctokit({auth: options['github-auth']});
  return octokit.rest.users.getAuthenticated()
  .then(user => {
    const metaData = lando.cache.get(`${options.name}.meta.cache`) || {};
    lando.cache.set(`${options.name}.meta.cache`, _.merge({}, metaData, {email: user.data.email}), {persist: true});
    // Reset github tokens
    const tokens = lando.cache.get(githubTokenCache) || [];
    const cache = {token: options['github-auth'], user: user.data.login, date: _.toInteger(_.now() / 1000)};
    lando.cache.set(githubTokenCache, sortTokens(tokens, [cache]), {persist: true});
  });
};

// Helper to determine whether to show list of pre-used tokens or not
const showTokenList = (source, tokens = []) => !_.isEmpty(tokens) && source === 'github';

// Helper to determine whether to show token password entry or not
const showTokenEntry = (source, answer, tkez = []) => ((_.isEmpty(tkez) || answer === 'more')) && source === 'github';

// Helper to get list of github projects
const getRepos = answers => {
  // Log
  console.log('Getting your GitHub repos... this may take a moment if you have a lot');
  const octokit = getOctokit({auth: answers['github-auth']});
  return octokit.paginate('GET /user/repos', {affliation: 'owner,collaborator,organization_member', per_page: 100})
  .then(results => results.map(result => ({name: result.full_name, value: result.ssh_url})))
  .catch(gerror => {
    const error = new Error(`Could not get sites! [${gerror.status}] ${gerror.message}`);
    error.code = gerror.status;
    error.stack = JSON.stringify(gerror);
    return Promise.reject(error);
  });
};

// Helper to get sites for autocomplete
const getAutoCompleteRepos = (answers, Promise, input = null) => {
  if (!_.isEmpty(gitHubRepos)) {
    return Promise.resolve(gitHubRepos).filter(site => _.startsWith(site.name, input));
  } else {
    return getRepos(answers).then(sites => {
      gitHubRepos = sites;
      return gitHubRepos;
    });
  }
};

module.exports = {
  sources: [{
    name: 'github',
    label: 'github',
    options: lando => ({
      'github-auth': {
        describe: 'Uses a GitHub personal access token',
        string: true,
        interactive: {
          type: 'list',
          choices: parseTokens(lando.cache.get(githubTokenCache)),
          message: 'Select a GitHub user',
          when: answers => showTokenList(answers.source, lando.cache.get(githubTokenCache)),
          weight: 110,
        },
      },
      'github-auth-token': {
        hidden: true,
        interactive: {
          name: 'github-auth',
          type: 'password',
          message: 'Enter a GitHub personal access token',
          when: answers => showTokenEntry(answers.source, answers['github-auth'], lando.cache.get(githubTokenCache)),
          weight: 120,
        },
      },
      'github-repo': {
        describe: 'Uses the GitHub git url',
        string: true,
        interactive: {
          type: 'autocomplete',
          message: 'Which repo?',
          source: (answers, input) => {
            return getAutoCompleteRepos(answers, lando.Promise, input);
          },
          when: answers => answers.source === 'github',
          weight: 130,
        },
      },
      'github-key-name': {
        describe: 'A hidden field mostly for easy testing and key removal',
        string: true,
        hidden: true,
        default: 'Landokey',
      },
    }),
    build: (options, lando) => ([
      {name: 'wait-for-user', cmd: `/helpers/wait-for-user.sh www-data ${lando.config.uid}`},
      {name: 'generate-key', cmd: `/helpers/generate-key.sh ${gitHubLandoKey} ${gitHubLandoKeyComment}`},
      {name: 'post-key', func: (options, lando) => {
        return postKey(
          path.join(lando.config.userConfRoot, 'keys'),
          options['github-auth'],
          options['github-key-name'],
        );
      }},
      {name: 'reload-keys', cmd: '/helpers/load-keys.sh --silent', user: 'root'},
      {name: 'clone-repo', cmd: `/helpers/get-remote-url.sh ${options['github-repo']}`, remove: true},
      {name: 'set-caches', func: (options, lando) => setCaches(options, lando)},
    ]),
  }],
};
