#!/bin/bash
set -eo pipefail

WRITER=paperback-writer

# PARSE THE ARGZZ
while (( "$#" )); do
  case "$1" in
    --writer)
      WRITER="$2"
      shift 2
    ;;
    --writer=*)
      WRITER="${1#*=}"
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

echo "$WRITER" > "/tmp/$WRITER"

cat "/tmp/$WRITER"
