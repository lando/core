#!/bin/sh

# This script contains utility functions for Lando

# Enable debug mode if DEBUG environment variable is set to "1"
if [ "$DEBUG" = "1" ]; then
  LANDO_DEBUG="--debug"
fi

# Define terminal color escape sequences if output is to a terminal
if [ -t 1 ]; then
  tty_escape() { printf "\033[%sm" "$1"; }
else
  tty_escape() { :; }
fi

# Define color and style functions
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

# Remove trailing newline from a string
chomp() {
  printf "%s" "${1%$'\n'}"
}

# Join arguments into a single string, escaping spaces
# This function takes any number of arguments and joins them into a single string,
# escaping spaces in each argument. This is useful for creating command strings
# that can be safely passed to other commands or functions.
#
# Usage: shell_join arg1 "arg 2" arg3
# Output: arg1 arg\ 2 arg3
shell_join() {
  local arg
  printf "%s" "${1:-}"
  shift
  for arg in "$@"; do
    printf " "
    printf "%s" "${arg// /\ }"
  done
}

# Print an error message and exit
abort() {
  printf "${tty_red}ERROR${tty_reset}: %s\n" "$(chomp "$1")" >&2
  exit 1
}

# Print multiple error messages and exit
# This function reads lines from standard input and prints each line
# as an error message. After all lines are printed, the script exits.
#
# Usage: echo -e "Error 1\nError 2" | abort_multi
abort_multi() {
  while read -r line; do
    printf "${tty_red}ERROR${tty_reset}: %s\n" "$(chomp "$line")" >&2
  done
  exit 1
}

# Print a debug message if debug mode is enabled
debug() {
  if [ -n "${LANDO_DEBUG-}" ]; then
    printf "${tty_dim}debug${tty_reset} %s\n" "$(shell_join "$@")" >&2
  fi
}

# Print multiple debug messages if debug mode is enabled
# This function reads lines from standard input and prints each line
# as a debug message, prefixed with the first argument.
#
# Usage: echo -e "line1\nline2" | debug_multi "prefix"
debug_multi() {
  if [ -n "${LANDO_DEBUG-}" ]; then
    while read -r line; do
      debug "$1 $line"
    done
  fi
}

# Print a log message
log() {
  printf "%s\n" "$(shell_join "$@")"
}

# Retry a command with exponential backoff
# This function attempts to run a command multiple times, with increasing
# delays between attempts. It's useful for commands that may fail due to
# temporary issues (e.g., network problems).
#
# Usage: retry command [arg1 [arg2 ...]]
#
# Environment variables:
#   MAX_ATTEMPTS: Maximum number of attempts (default: 10)
#   INITIAL_DELAY: Initial delay in seconds (default: 1)
#   FACTOR: Multiplier for delay increase (default: 2)
#
# Example: retry curl http://example.com
retry() {
  max_attempts=${MAX_ATTEMPTS-10}
  initial_delay=${INITIAL_DELAY-1}
  factor=${FACTOR-2}
  attempt=1
  delay=$initial_delay

  while true; do
    "$@"
    local status=$?
    if [ $status -eq 0 ]; then
      return 0
    fi

    if [ $attempt -ge $max_attempts ]; then
      debug "attempt $attempt failed and there are no more attempts left!"
      return $status
    fi

    debug "attempt $attempt failed! retrying in $delay seconds..."
    sleep $delay
    attempt=$((attempt + 1))
    delay=$((delay * factor))
  done
}

# Print a warning message
warn() {
  printf "${tty_yellow}warning${tty_reset}: %s\n" "$(chomp "$@")" >&2
}

# Print multiple warning messages
# This function reads lines from standard input and prints each line
# as a warning message.
#
# Usage: echo -e "Warning 1\nWarning 2" | warn_multi
warn_multi() {
  while read -r line; do
    warn "${line}"
  done
}
