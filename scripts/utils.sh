#!/bin/sh

# Set lando debug
if [ "$DEBUG" = "1" ]; then
  LANDO_DEBUG="--debug"
fi

if [ -t 1 ]; then
  tty_escape() { printf "\033[%sm" "$1"; }
else
  tty_escape() { :; }
fi
tty_mkbold() { tty_escape "1;$1"; }
tty_mkdim() { tty_escape "2;$1"; }
tty_blue="$(tty_escape 34)"
tty_bold="$(tty_mkbold 39)"
tty_dim="$(tty_mkdim 39)"
tty_green="$(tty_escape 32)"
tty_magenta="$(tty_escape 35)"
tty_red="$(tty_mkbold 31)"
tty_reset="$(tty_escape 0)"
tty_underline="$(tty_escape "4;39")"
tty_yellow="$(tty_escape 33)"

chomp() {
  printf "%s" "${1%$'\n'}"
}

shell_join() {
  local arg
  printf "%s" "${1:-}"
  shift
  for arg in "$@"; do
    printf " "
    printf "%s" "${arg// /\ }"
  done
}

# redefine this one
abort() {
  printf "${tty_red}ERROR${tty_reset}: %s\n" "$(chomp "$1")" >&2
  exit 1
}

abort_multi() {
  while read -r line; do
    printf "${tty_red}ERROR${tty_reset}: %s\n" "$(chomp "$line")" >&2
  done
  exit 1
}

debug() {
  if [ -n "${LANDO_DEBUG-}" ]; then
    printf "${tty_dim}debug${tty_reset} %s\n" "$(shell_join "$@")" >&2
  fi
}

debug_multi() {
  if [ -n "${LANDO_DEBUG-}" ]; then
    while read -r line; do
      debug "$1 $line"
    done
  fi
}

log() {
  printf "%s\n" "$(shell_join "$@")"
}

retry() {
  local max_attempts=\${MAX_ATTEMPTS-10}
  local initial_delay=\${INITIAL_DELAY-1}
  local factor=\${FACTOR-2}
  local attempt=1
  local delay=$initial_delay

  while true; do
    "$@"
    local status=$?
    if [ $status -eq 0 ]; then
      return 0
    fi

    if [ $attempt -ge $max_attempts ]; then
      debug "Attempt $attempt failed and there are no more attempts left!"
      return $status
    fi

    debug "Attempt $attempt failed! Retrying in $delay seconds..."
    sleep $delay
    attempt=$((attempt + 1))
    delay=$((delay * factor))
  done
}

warn() {
  printf "${tty_yellow}warning${tty_reset}: %s\n" "$(chomp "$@")" >&2
}

warn_multi() {
  while read -r line; do
    warn "${line}"
  done
}
