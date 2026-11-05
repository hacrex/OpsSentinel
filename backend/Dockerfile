FROM node:18-alpine

# ── Pinned IaC CLI versions ──
# Bump these on every release. Pinning prevents surprise upgrades that
# can break existing stacks.
ENV OPEN_TOFU_VERSION=1.8.0
ENV TERRAFORM_VERSION=1.7.5
ENV PULUMI_VERSION=3.87.0
ENV KUBECTL_VERSION=1.29.3
ENV AWS_CLI_VERSION=2.15.4
ENV AWS_CDK_VERSION=2.143.0
ENV PACKER_VERSION=1.11.2
ENV VAGRANT_VERSION=2.3.7
ENV ANSIBLE_VERSION=2.16.0

WORKDIR /app

# ── System packages ──
# git, curl, wget, unzip: needed to download and extract CLIs
# gnupg, ca-certificates, openssh-client: needed for GitOps (private repos, SSH keys)
# python3, py3-pip: needed for ansible + aws-cli via pip
RUN apk add --no-cache \
    bash \
    curl \
    wget \
    unzip \
    gnupg \
    ca-certificates \
    openssh-client \
    git \
    python3 \
    py3-pip \
    && \
    # ── Ansible ──
    pip3 install --no-cache-dir "ansible==${ANSIBLE_VERSION}" \
    && \
    # ── AWS CLI ──
    pip3 install --no-cache-dir "awscli==${AWS_CLI_VERSION}" \
    && \
    # ── OpenTofu ──
    wget -q "https://github.com/opentofu/opentofu/releases/download/v${OPEN_TOFU_VERSION}/tofu_${OPEN_TOFU_VERSION}_linux_amd64.tar.gz" -O /tmp/tofu.tar.gz \
    && tar -xzf /tmp/tofu.tar.gz -C /usr/local/bin \
    && rm /tmp/tofu.tar.gz \
    && \
    # ── Terraform ──
    wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" -O /tmp/terraform.zip \
    && unzip -o /tmp/terraform.zip -d /usr/local/bin \
    && rm /tmp/terraform.zip \
    && \
    # ── Pulumi ──
    curl -fsSL https://get.pulumi.com | sh -s -- --version "${PULUMI_VERSION}" \
    && ln -s /root/.pulumi/bin/pulumi /usr/local/bin/pulumi \
    && \
    # ── kubectl ──
    curl -LO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl \
    && \
    # ── AWS CDK ──
    npm install -g "aws-cdk@${AWS_CDK_VERSION}" \
    && \
    # ── Packer ──
    wget -q "https://releases.hashicorp.com/packer/${PACKER_VERSION}/packer_${PACKER_VERSION}_linux_amd64.zip" -O /tmp/packer.zip \
    && unzip -o /tmp/packer.zip -d /usr/local/bin \
    && rm /tmp/packer.zip \
    && \
    # ── Vagrant ──
    wget -q "https://releases.hashicorp.com/vagrant/${VAGRANT_VERSION}/vagrant_${VAGRANT_VERSION}_linux_amd64.zip" -O /tmp/vagrant.zip \
    && unzip -o /tmp/vagrant.zip -d /usr/local/bin \
    && rm /tmp/vagrant.zip \
    && \
    # ── Azure CLI (provides `az` for Bicep engine) ──
    curl -L https://aka.ms/InstallAzureCli | sh

# ── Node.js app ──
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001
CMD ["node", "src/server.js"]
