#!/bin/bash

# semcompare.sh
# Usage: ./semcompare.sh version1 version2

version1="$1"
version2="$2"

parse_version() {
  local version="$1"
  local major minor patch pre_release

  # Updated regex to allow optional leading 'v'
  if [[ "$version" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+)(-([0-9A-Za-z.-]+))?$ ]]; then
    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"
    pre_release="${BASH_REMATCH[5]}"
  else
    echo "Invalid version: $version" >&2
    exit 1
  fi

  echo "$major" "$minor" "$patch" "$pre_release"
}

compare_pre_release() {
    local pre1="$1"
    local pre2="$2"

    # If both are empty, they're equal
    if [[ -z "$pre1" && -z "$pre2" ]]; then
      echo 0
      return
    fi

    # A version without pre-release is higher
    if [[ -z "$pre1" ]]; then
      echo 1
      return
    fi
    if [[ -z "$pre2" ]]; then
      echo -1
      return
    fi

    IFS='.' read -ra arr1 <<< "$pre1"
    IFS='.' read -ra arr2 <<< "$pre2"

    local len1="${#arr1[@]}"
    local len2="${#arr2[@]}"
    local len=$(( len1 > len2 ? len1 : len2 ))

    for ((i=0; i<len; i++)); do
      id1="${arr1[i]}"
      id2="${arr2[i]}"

      # Treat missing identifiers as empty strings
      [[ -z "$id1" ]] && id1=""
      [[ -z "$id2" ]] && id2=""

      # Numeric identifiers compare numerically
      if [[ "$id1" =~ ^[0-9]+$ ]] && [[ "$id2" =~ ^[0-9]+$ ]]; then
        if ((10#$id1 > 10#$id2)); then
          echo 1
          return
        elif ((10#$id1 < 10#$id2)); then
          echo -1
          return
        fi
      else
        # Alphanumeric identifiers compare lexically
        if [[ "$id1" > "$id2" ]]; then
          echo 1
          return
        elif [[ "$id1" < "$id2" ]]; then
          echo -1
          return
        fi
      fi
    done

    echo 0
}

compare_versions() {
  local v1=($1)
  local v2=($2)

  local major1="${v1[0]}"
  local minor1="${v1[1]}"
  local patch1="${v1[2]}"
  local pre1="${v1[3]}"

  local major2="${v2[0]}"
  local minor2="${v2[1]}"
  local patch2="${v2[2]}"
  local pre2="${v2[3]}"

  # Compare major
  if ((major1 > major2)); then
    echo 1
    return
  elif ((major1 < major2)); then
    echo -1
    return
  fi

  # Compare minor
  if ((minor1 > minor2)); then
    echo 1
    return
  elif ((minor1 < minor2)); then
    echo -1
    return
  fi

  # Compare patch
  if ((patch1 > patch2)); then
    echo 1
    return
  elif ((patch1 < patch2)); then
    echo -1
    return
  fi

  # Compare pre-release
  pre_release_cmp=$(compare_pre_release "$pre1" "$pre2")
  echo "$pre_release_cmp"
}

v1_components=$(parse_version "$version1")
v2_components=$(parse_version "$version2")

result=$(compare_versions "$v1_components" "$v2_components")

# Return 1 if the first version is higher, else 0
if [[ "$result" -gt 0 ]]; then
  exit 0
else
  exit 1
fi
