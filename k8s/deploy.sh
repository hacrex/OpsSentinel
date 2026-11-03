#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="ops-sentinel"

echo "🚀 Deploying OpsSentinel to Kubernetes"

# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets (user must edit values first)
echo "⚠️  Please edit k8s/backend.yaml and k8s/frontend.yaml with your secrets before continuing"
read -p "Press enter to continue after editing secrets..."

kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/hpa.yaml

echo "✅ Deployment complete"
echo ""
echo "Check status: kubectl get all -n $NAMESPACE"
echo "Port forward: kubectl port-forward svc/frontend 8080:80 -n $NAMESPACE"
