# OpsSentinel Kubernetes Deployment

Deploy OpsSentinel to Kubernetes using the manifests in this directory.

## Prerequisites

- Kubernetes cluster (1.23+)
- `kubectl` configured
- Docker images built and pushed to a registry

## Quick Start

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check status
kubectl get all -n ops-sentinel

# Port-forward to access locally
kubectl port-forward svc/frontend 8080:80 -n ops-sentinel
```

## Configuration

### Backend Secrets

Edit `k8s/backend.yaml` and set your values in the `backend-secret`:

```yaml
stringData:
  GITHUB_WEBHOOK_SECRET: your-webhook-secret
  GITHUB_CLIENT_ID: your-github-client-id
  GITHUB_CLIENT_SECRET: your-github-client-secret
```

Then apply:

```bash
kubectl apply -f k8s/backend.yaml
```

### Frontend Config

Set your GitHub OAuth Client ID in `k8s/frontend.yaml`:

```yaml
data:
  VITE_GITHUB_CLIENT_ID: your-github-client-id
```

## Components

| Manifest | Description |
|----------|-------------|
| `namespace.yaml` | `ops-sentinel` namespace |
| `postgres.yaml` | PostgreSQL deployment, service, PVC, secret |
| `backend.yaml` | Backend deployment, service, configmap, secret |
| `frontend.yaml` | Frontend deployment, service, configmap |
| `hpa.yaml` | HorizontalPodAutoscaler for backend |

## Scaling

```bash
# Manual scale
kubectl scale deployment backend -n ops-sentinel --replicas 5

# HPA handles autoscaling based on CPU/memory
kubectl get hpa -n ops-sentinel
```

## Teardown

```bash
kubectl delete -f k8s/
```
