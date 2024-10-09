# Destroy Example

This example exists primarily to test the following documentation:

* [`lando destroy`](https://docs.lando.dev/cli/destroy.html)

See the [Landofiles](https://docs.lando.dev/config/lando.html) in this directory for the exact magicks.

## Start up tests

```bash
# Should start successfully
lando poweroff
lando start
```

## Verification commands

Run the following commands to verify things work as expected

```bash
# Services, volumes, and networks should exist
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node1_1
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node2_1
docker volume ls | grep landodestroy-node1-usr-share-node
docker volume ls | grep landodestroy-node2-usr-share-node
docker network ls | grep landodestroy_default

# Should destroy the specified services
lando destroy --service node1 --yes
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node1_1; [ $? -ne 0 ]
docker volume ls | grep landodestroy-node1-usr-share-node; [ $? -ne 0 ]

# Should not destroy the unspecified services
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node2_1
docker volume ls | grep landodestroy-node2-usr-share-node
docker network ls | grep landodestroy_default

# Should rebuild the destroyed service
lando start
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node1_1
docker volume ls | grep landodestroy-node1-usr-share-node
```

## Destroy tests

```bash
# Should destroy successfully
lando destroy -y
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node1_1; [ $? -ne 0 ]
docker ps --filter label=com.docker.compose.project=landodestroy | grep landodestroy_node2_1; [ $? -ne 0 ]
docker volume ls | grep landodestroy-node1-usr-share-node; [ $? -ne 0 ]
docker volume ls | grep landodestroy-node2-usr-share-node; [ $? -ne 0 ]
docker network ls | grep landodestroy_default; [ $? -ne 0 ]
lando poweroff
```
