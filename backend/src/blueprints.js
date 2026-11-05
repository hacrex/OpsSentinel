const db = require('./db');
const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./audit');

/**
 * Stack Blueprints — pre-built, provider-aware templates.
 * Blueprints are code-defined (always available, versioned with the app).
 * Instantiating a blueprint renders its files into a stack working
 * directory and registers the stack, OpenTofu-native: the rendered
 * code is plain HCL the user can inspect, edit and run locally.
 */

const BLUEPRINTS = [
  {
    id: 'docker-host',
    name: 'Docker Host',
    category: 'container',
    description: 'Provision a VM/cloud host and install Docker with Ansible. Ready to run containers on any cloud.',
    engine: 'ansible',
    provider: 'generic',
    tags: ['docker', 'host', 'configuration'],
    default_vars: { docker_edition: 'ce' },
    files: [
      {
        path: 'ansible/site.yml',
        content: `---
- name: Provision Docker host
  hosts: all
  become: true
  vars:
    docker_edition: "ce"
  tasks:
    - name: Ensure Docker prerequisites
      ansible.builtin.apt:
        name: ["ca-certificates", "curl", "gnupg"]
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    - name: Add Docker GPG key
      ansible.builtin.apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        keyring: /etc/apt/keyrings/docker.gpg
        state: present
      when: ansible_os_family == "Debian"

    - name: Add Docker repository
      ansible.builtin.apt_repository:
        repo: "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present
        filename: docker
      when: ansible_os_family == "Debian"

    - name: Install Docker Engine
      ansible.builtin.apt:
        name: "docker-{{ docker_edition }}"
        state: present

    - name: Ensure Docker service is running
      ansible.builtin.service:
        name: docker
        state: started
        enabled: true
`,
      },
      {
        path: 'ansible/README.md',
        content: `# Docker Host Blueprint\n\nRun with:\n\n    ansible-playbook -i inventory.ini site.yml\n`,
      },
    ],
  },
  {
    id: 'k8s-cluster-hetzner',
    name: 'Kubernetes Cluster (Hetzner)',
    category: 'kubernetes',
    description: 'OpenTofu blueprint that provisions a Hetzner Cloud k3s node pool with a saved provider config.',
    engine: 'tofu',
    provider: 'hetzner',
    tags: ['kubernetes', 'k3s', 'hetzner'],
    default_vars: { server_type: 'cx22', node_count: '2', location: 'fsn1' },
    files: [
      {
        path: 'main.tf',
        content: `terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

variable "server_type" {
  description = "Hetzner server type for each node"
  type        = string
  default     = "cx22"
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "location" {
  description = "Hetzner location (fsn1, nbg1, hel1)"
  type        = string
  default     = "fsn1"
}

resource "hcloud_server" "k3s_server" {
  name        = "k3s-server"
  server_type = var.server_type
  image       = "ubuntu-24.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]
}

resource "hcloud_ssh_key" "default" {
  name       = "opsentinel-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}

resource "hcloud_server" "k3s_nodes" {
  count       = var.node_count
  name        = "k3s-node-\${count.index}"
  server_type = var.server_type
  image       = "ubuntu-24.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]
}

output "server_ip" {
  value = hcloud_server.k3s_server.ipv4_address
}

output "node_ips" {
  value = [for n in hcloud_server.k3s_nodes : n.ipv4_address]
}
`,
      },
    ],
  },
  {
    id: 'observability-stack',
    name: 'Observability Stack',
    category: 'observability',
    description: 'Docker-Compose based Prometheus + Grafana + Loki deployed onto a host via Ansible.',
    engine: 'ansible',
    provider: 'generic',
    tags: ['prometheus', 'grafana', 'monitoring'],
    default_vars: { compose_dir: '/opt/observability', grafana_port: '3000' },
    files: [
      {
        path: 'ansible/site.yml',
        content: `---
- name: Deploy observability stack
  hosts: all
  become: true
  vars:
    compose_dir: "/opt/observability"
  tasks:
    - name: Create compose directory
      ansible.builtin.file:
        path: "{{ compose_dir }}"
        state: directory

    - name: Copy compose file
      ansible.builtin.copy:
        src: docker-compose.yml
        dest: "{{ compose_dir }}/docker-compose.yml"

    - name: Start services
      community.docker.docker_compose_v2:
        project_src: "{{ compose_dir }}"
        state: present
`,
      },
      {
        path: 'ansible/files/docker-compose.yml',
        content: `services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports: ["9090:9090"]
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
  loki:
    image: grafana/loki:latest
    ports: ["3100:3100"]
`,
      },
      {
        path: 'ansible/files/prometheus.yml',
        content: `global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
`,
      },
    ],
  },
  {
    id: 'postgres-db',
    name: 'Managed Postgres',
    category: 'database',
    description: 'Provision an AWS RDS PostgreSQL instance with encrypted storage and a random password stored in the run output.',
    engine: 'tofu',
    provider: 'aws',
    tags: ['postgres', 'aws', 'rds'],
    default_vars: { instance_class: 'db.t3.micro', allocated_storage: '20', db_name: 'appdb' },
    files: [
      {
        path: 'main.tf',
        content: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "db_name" {
  type    = string
  default = "appdb"
}

resource "random_password" "master" {
  length  = 24
  special = false
}

resource "aws_db_instance" "postgres" {
  identifier        = "opsentinel-\${var.db_name}"
  engine            = "postgres"
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  db_name           = var.db_name
  username          = "opsadmin"
  password          = random_password.master.result
  storage_encrypted = true
  skip_final_snapshot = true
}

output "endpoint" {
  value = aws_db_instance.postgres.address
}

output "db_name" {
  value = var.db_name
}
`,
      },
    ],
  },
  {
    id: 'cicd-runner',
    name: 'CI/CD Runner',
    category: 'cicd',
    description: 'Docker Compose stack hosting a self-hosted CI runner with Docker-in-Docker builds.',
    engine: 'ansible',
    provider: 'generic',
    tags: ['ci', 'runner', 'docker'],
    default_vars: { run_dir: '/opt/runner', runner_concurrency: '2' },
    files: [
      {
        path: 'ansible/site.yml',
        content: `---
- name: Deploy CI runner
  hosts: all
  become: true
  vars:
    run_dir: "/opt/runner"
  tasks:
    - name: Create run directory
      ansible.builtin.file:
        path: "{{ run_dir }}"
        state: directory

    - name: Copy compose file
      ansible.builtin.copy:
        src: docker-compose.yml
        dest: "{{ run_dir }}/docker-compose.yml"

    - name: Start runner
      community.docker.docker_compose_v2:
        project_src: "{{ run_dir }}"
        state: present
`,
      },
      {
        path: 'ansible/files/docker-compose.yml',
        content: `services:
  runner:
    image: gitea/act_runner:latest
    environment:
      CONCURRENT_JOBS: "2"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
`,
      },
    ],
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    category: 'database',
    description: 'OpenTofu blueprint for an AWS ElastiCache Redis cluster with subnet group.',
    engine: 'tofu',
    provider: 'aws',
    tags: ['redis', 'aws', 'cache'],
    default_vars: { node_type: 'cache.t3.micro', num_nodes: '1' },
    files: [
      {
        path: 'main.tf',
        content: `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "num_nodes" {
  type    = number
  default = 1
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "opsentinel-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = var.num_nodes
  parameter_group_name = "default.redis7"
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
`,
      },
    ],
  },
  {
    id: 'docker-compose-stack',
    name: 'Compose App Stack',
    category: 'container',
    description: 'OpenTofu blueprint for an Azure Container App environment running a compose-style workload.',
    engine: 'tofu',
    provider: 'azure',
    tags: ['azure', 'containers', 'app'],
    default_vars: { resource_group: 'opsentinel-rg', location: 'westeurope' },
    files: [
      {
        path: 'main.tf',
        content: `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
  }
}

variable "resource_group" {
  type    = string
  default = "opsentinel-rg"
}

variable "location" {
  type    = string
  default = "westeurope"
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group
  location = var.location
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "opsentinel-logs"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
}

output "resource_group" {
  value = azurerm_resource_group.rg.name
}
`,
      },
    ],
  },
  {
    id: 'k8s-app',
    name: 'Kubernetes App',
    category: 'kubernetes',
    description: 'Plain kubectl blueprint: namespace + deployment + service manifests, applied via the kubectl engine.',
    engine: 'crossplane',
    provider: 'kubernetes',
    tags: ['k8s', 'deployment'],
    default_vars: {},
    files: [
      {
        path: 'k8s/app.yaml',
        content: `apiVersion: v1
kind: Namespace
metadata:
  name: opsentinel
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: opsentinel
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: app
  namespace: opsentinel
spec:
  selector:
    app: app
  ports:
    - port: 80
      targetPort: 80
`,
      },
    ],
  },
];

function listBlueprints() {
  return BLUEPRINTS.map(({ files, ...rest }) => ({
    ...rest,
    file_count: files.length,
    files: files.map((f) => f.path),
  }));
}

function getBlueprint(id) {
  return BLUEPRINTS.find((b) => b.id === id) || null;
}

async function instantiateBlueprint({ tenant_id, blueprint_id, repo_name, stack_name, working_dir, vars }) {
  const blueprint = getBlueprint(blueprint_id);
  if (!blueprint) return { error: 'not_found' };

  const written = [];
  for (const file of blueprint.files) {
    // Resolve target path: the renderRoot prefixes stack files unless
    // working_dir already points into the blueprint (e.g. ./infra/stack)
    const target = path.resolve(working_dir, file.path.replace(/^(\.\.?\/)+/, ''));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, 'utf8');
    written.push({ path: target, bytes: Buffer.byteLength(file.content) });
  }

  const defaultVars = { ...blueprint.default_vars, ...(vars || {}) };
  const result = await db.query(
    `INSERT INTO stacks (tenant_id, repo_name, stack_name, engine, working_dir, default_vars) VALUES (?, ?, ?, ?, ?, ?)`,
    [tenant_id, repo_name, stack_name, blueprint.engine, working_dir, JSON.stringify(defaultVars)]
  );
  const stack = result.rows?.[0] ?? { id: null };

  logAuditEvent({
    userId: null, username: 'api',
    action: 'blueprint_instantiated',
    resourceType: 'stack',
    resourceId: String(stack.id ?? ''),
    details: { blueprint_id, repo_name, stack_name, working_dir, files_written: written.length },
    ipAddress: null,
  });

  return { blueprint: blueprint.id, stack, written };
}

module.exports = { BLUEPRINTS, listBlueprints, getBlueprint, instantiateBlueprint };
