# Setup

## Environment Setup

### WSL2

Install WSL2 and Ubuntu 24.04 distro. References:

- <https://documentation.ubuntu.com/wsl/latest/howto/install-ubuntu-wsl2/>.
- <https://learn.microsoft.com/en-us/windows/wsl/install>.

### Docker Desktop

Install Docker Desktop. Reference: <https://docs.docker.com/desktop/setup/install/windows-install/>.

### Ubuntu Setup

- [Install VS Code on WSL2](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode).
- [Setup Git on Ubuntu](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-git).

### Install NodeJS

- [Install Node Version Manager (NVM)](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating).
- Install Node 24 through NVM: `nvm install 24` then `nvm use 24 --default`.
- Install PNPM: `npm i -g pnpm`.

## GitHub Setup

- Create a [GitHub account](https://github.com).
- [Create a SSH key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent#generating-a-new-ssh-key).
- [Add the Generated SSH Key to your Github Account](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).
- Send the github username and ssh **public key**.

## Clone Repository

- Clone [this repository](https://github.com/akbarmridho/personal-server) in Ubuntu 24 WSL filesystem: `git clone git@github.com:akbarmridho/personal-server.git`. See the ubuntu terminal and make sure it does not refer to any Windows filesystem (marked as C://drive or any windows-style path).
- Run `pnpm install` and familiarize with the repository.
- Open the repository through WSL2 VS Code. A popup to install recommended extensions will appear. Install those or see [this extension list](../.vscode/extensions.json).

## Setup Tailscale

- [Install Tailscale on **Windows**](https://tailscale.com/download).
- Join to the tailscale network through invitation link.

The server is available on `personal-01` hostname and the websites is available on `*.akbarmr.dev`. Go to <https://portal.akbarmr.dev> to see all the available websites. Connection to the tailscale network is required to access the website.
