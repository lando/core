#!/bin/bash
set -eo pipefail

DEBUG="${RUNNER_DEBUG:-0}"
DEPTH=1
DIRECTORY="."
OUTPUT_FILE="checksums.txt"
SHOW=

debug() {
  if [ "${DEBUG}" == 1 ]; then printf '%s\n' "$1" >&2; fi
}

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --debug)
      DEBUG=1
      shift
    ;;
    --depth)
      DEPTH="$2"
      shift 2
    ;;
    --depth=*)
      DEPTH="${1#*=}"
      shift
    ;;
    --directory)
      DIRECTORY="$2"
      shift 2
    ;;
    --directory=*)
      DIRECTORY="${1#*=}"
      shift
    ;;
    --output)
      OUTPUT_FILE="$2"
      shift 2
    ;;
    --output=*)
      OUTPUT_FILE="${1#*=}"
      shift
    ;;
    --show)
      SHOW=1
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
debug "DEBUG: $DEBUG"
debug "DEPTH: $DEPTH"
debug "DIRECTORY: $DIRECTORY"
debug "OUTPUT: $OUTPUT_FILE"
debug "SHOW: $SHOW"
debug ""

# Empty the output file if it already exists
> "$OUTPUT_FILE"

# Loop through each file in the directory with specified depth
find "$DIRECTORY" -maxdepth "$DEPTH" -type f | sort | while read -r file; do
  # Calculate the SHA-256 checksum and append to the output file
  sha256sum "${file#./}" >> "$OUTPUT_FILE"
  # debug
  debug "wrote checksum $(sha256sum "$file") to ${OUTPUT_FILE}"
done

# padding
debug ""

# cat the file if show is on
if [ "${SHOW}" == 1 ] || [ "${DEBUG}" == 1 ]; then
  cat "$OUTPUT_FILE"
  echo ""
fi

echo "Checksums written to $OUTPUT_FILE"
