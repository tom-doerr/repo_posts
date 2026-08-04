---
layout: default
date: 2026-08-04T13:07:13.311465
image: assets/2026-08-04-unixshells-clone.png
---

# [unixshells/clone](https://github.com/unixshells/clone)

clone is a lightweight linux vmm for multi-tenant shell hosting that uses shadow clone page mapping to rapidly fork isolated virtual machine copies. this architecture allows a host running 100 shells to consume memory comparable to just 10 active instances, providing hardware-level security without the typical performance penalty of running numerous separate virtual machines.
