#!/bin/bash
set -eo pipefail

CA="~/.lando/certs/LandoCA.crt"
DEBUG=0
FINGERPRINT=
KEYCHAIN="$(security login-keychain | sed 's/^ *"//;s/" *$//' | xargs)"
NONINTERACTIVE=0

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    -c|--ca)
      CA="$2"
      shift 2
    ;;
    -c=*|--ca=*)
      CA="${1#*=}"
      shift
    ;;
    --debug)
      DEBUG=1
      shift
    ;;
    -f|--fingerprint)
      FINGERPRINT="$2"
      shift 2
    ;;
    -f=*|--fingerprint=*)
      FINGERPRINT="${1#*=}"
      shift
    ;;
    -k|--keychain)
      KEYCHAIN="$2"
      shift 2
    ;;
    -k=*|--keychain=*)
      KEYCHAIN="${1#*=}"
      shift
    ;;
    --non-interactive)
      NONINTERACTIVE=1
      shift
    ;;
    --)
      shift
      break
    ;;
    -*|--*=)
      shift
    ;;
    *)
      shift
    ;;
  esac
done

# debug
debug "running script with:"
debug "CA: $CA"
debug "CI: ${CI:-}"
debug "DEBUG: $DEBUG"
debug "FINGERPRINT: $FINGERPRINT"
debug "KEYCHAIN: $KEYCHAIN"
debug "NONINTERACTIVE: $NONINTERACTIVE"

# force noninteractive in CI
if [[ -n "${CI-}" && "$NONINTERACTIVE" == "0" ]]; then
  debug "running in non-interactive mode because CI=${CI} is set."
  NONINTERACTIVE=1
fi

debug "more debug."

# suppress GUI prompt in non interactive situations
if [[ "$NONINTERACTIVE" == "1" ]]; then
  debug "allowing sudo to write to trust store without popup."
  sudo security authorizationdb write com.apple.trust-settings.user allow
fi

# add CA to default login keychain
# in CI we need to sudo add to the store to avoid the password popup
# if [[ -n "${CI-}" ]]; then
#   debug "SUDO"
#   sudo security add-trusted-cert \
#     -d \
#     -r trustRoot \
#     -k "/Library/Keychains/System.keychain" \
#     "$CA" \
#     || (security delete-certificate -Z "$FINGERPRINT" -t "$KEYCHAIN" && exit 1)

# otherwise prompt the user
debug "NORMAL"
security add-trusted-cert \
  -r trustRoot \
  -k "$KEYCHAIN" \
  "$CA" \
  || (security delete-certificate -Z "$FINGERPRINT" -t "$KEYCHAIN" && exit 1)
