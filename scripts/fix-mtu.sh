#!/bin/bash

# Configuration
NETWORK_NAME="personal_network"
MTU_SIZE="1280"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Network MTU Fix for '${NETWORK_NAME}'...${NC}"

# 1. Get list of all running containers attached to the network
echo -e "\n${YELLOW}[1/5] Identifying containers on network '${NETWORK_NAME}'...${NC}"
CONTAINERS=$(docker network inspect ${NETWORK_NAME} -f '{{range .Containers}}{{.Name}} {{end}}')

if [ -z "$CONTAINERS" ]; then
    echo -e "${RED}No containers found on network '${NETWORK_NAME}'. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Found containers:${NC} $CONTAINERS"

# 2. Stop the containers
echo -e "\n${YELLOW}[2/5] Stopping containers...${NC}"
docker stop $CONTAINERS

# 3. Remove the existing network
echo -e "\n${YELLOW}[3/5] Removing old network...${NC}"
docker network rm ${NETWORK_NAME}

# 4. Recreate the network with MTU 1280
echo -e "\n${YELLOW}[4/5] Creating new network with MTU ${MTU_SIZE}...${NC}"
docker network create \
  --driver bridge \
  --opt com.docker.network.driver.mtu=${MTU_SIZE} \
  ${NETWORK_NAME}

# 5. Start the containers again
echo -e "\n${YELLOW}[5/5] Restarting containers...${NC}"
docker start $CONTAINERS

echo -e "\n${GREEN}Success! Network recreated with MTU ${MTU_SIZE}.${NC}"
echo -e "${GREEN}All containers have been restarted.${NC}"
