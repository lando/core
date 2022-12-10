# docker build -t devwithlando/util:4 .

FROM debian:buster-slim
RUN apt-get update && apt-get install -y \
    bzip2 \
    curl \
    git-core \
    jq \
    rsync \
    ssh \
    wget \
    unzip \
  && apt-get -y clean \
  && apt-get -y autoclean \
  && apt-get -y autoremove \
  && rm -rf /var/lib/apt/lists/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*
