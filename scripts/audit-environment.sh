#!/usr/bin/env bash
# Phase 0 environment audit — READ ONLY. Run on the office server before deploying AVA:
#   scripts/audit-environment.sh > environment-report.txt
# Makes no changes. Share the report with whoever selects the AI model (docs/AI.md).
set -uo pipefail

section() { printf '\n== %s ==\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

section "Operating system"
(cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|VERSION_ID)=') || uname -a
uname -r

section "CPU"
if have lscpu; then lscpu | grep -E 'Model name|^CPU\(s\)|Thread|Core|Socket'; else nproc; fi
if grep -qw avx512f /proc/cpuinfo 2>/dev/null; then echo "Vector extensions: AVX-512 (good for CPU inference)"
elif grep -qw avx2 /proc/cpuinfo 2>/dev/null; then echo "Vector extensions: AVX2 (adequate for CPU inference)"
else echo "Vector extensions: no AVX2 — CPU inference will be slow"; fi

section "Memory"
free -h 2>/dev/null || cat /proc/meminfo | head -3

section "GPU"
if have nvidia-smi; then nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
elif have rocm-smi; then rocm-smi --showproductname --showmeminfo vram
else echo "No NVIDIA/AMD GPU tools found (assume CPU-only inference)."; lspci 2>/dev/null | grep -iE 'vga|3d|display'; fi

section "Storage"
df -h -x tmpfs -x devtmpfs -x overlay -x squashfs 2>/dev/null

section "Docker"
if have docker; then docker --version; docker compose version 2>/dev/null || echo "Docker Compose v2 missing"; docker info --format 'Storage driver: {{.Driver}}  Root: {{.DockerRootDir}}' 2>/dev/null || echo "Docker daemon not reachable (permissions?)"
  echo "Running containers:"; docker ps --format '  {{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null
else echo "Docker not installed."; fi

section "Listening ports (possible conflicts: 80, 443, 5432, 6379, 11434)"
if have ss; then ss -ltnH 2>/dev/null | awk '{print $4}' | sort -u; elif have netstat; then netstat -ltn | awk 'NR>2{print $4}' | sort -u; fi

section "Existing services of interest"
for svc in postgresql redis nginx apache2 httpd caddy ollama; do
  if have systemctl && systemctl list-unit-files 2>/dev/null | grep -q "^${svc}"; then
    printf '%-12s %s\n' "$svc" "$(systemctl is-active "$svc" 2>/dev/null)"; fi
done
have ollama && ollama list 2>/dev/null

section "Network"
hostname -f 2>/dev/null || hostname
ip -brief addr 2>/dev/null | grep -v '^lo'
echo "DNS resolvers:"; grep nameserver /etc/resolv.conf 2>/dev/null
echo "Can resolve ava.office.local? $(getent hosts ava.office.local >/dev/null && echo yes || echo 'no (DNS record not created yet)')"

section "Done"
echo "No changes were made to this system."
