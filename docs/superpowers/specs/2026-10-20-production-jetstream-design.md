# Development Compose and JetStream Design

## Scope

Implement the authorized JetStream migration, development-only Compose, portable direct/shortcut workflows, package-level test folders, reusable VS Code tasks, and dedicated service READMEs. Preserve Node 24, existing HTTP/event payload contracts, MongoDB and Redis/Bull responsibilities, local common packaging, Vitest assertions, and the existing frontend.

Scope revision, 2026-10-20: the user explicitly cancelled all production Docker. Remove production image stages, production Compose/environment examples and deployment-only proxy/auth configuration. Keep development containers and the existing Next build as a compilation gate. This revision supersedes the original production deployment request; the historical filename remains for existing links.

This is an implementation specification, not a statement that the changes or verification are complete. Progress is tracked in [../plans/2026-10-20-production-jetstream.md](../plans/2026-10-20-production-jetstream.md).

## Direct Compose First

The root README must lead with direct standard Compose commands, before npm shortcuts:

Docker Desktop:

```bash
docker compose up --build -d
```

Podman in WSL or Linux:

```bash
podman compose up --build -d
```

These commands must start the default application stack, including its required infrastructure, without needing npm, a host Node installation, a wrapper-only environment setting, or an undisclosed profile flag. The current infrastructure-only default/app-profile arrangement must therefore be adjusted. Preserve infrastructure-only development through explicit service selection or a separately documented standard Compose mode. Optional administration tools may remain opt-in if documented.

The Compose file must remain usable directly with either engine; do not rely on the shim to make the YAML valid or enable required application services. Do not provide production Docker targets or production Compose. Do not present the development command as a production-security guarantee.

Root npm Compose scripts are optional convenience shortcuts. Document the corresponding direct commands alongside them. Docker Desktop users must not need this project's WSL relay merely to run Compose; Docker Desktop's internal virtualization is not an application-level WSL requirement.

## Engine Selection Contract

The Compose shim selects the execution engine in this exact precedence:

| Priority | Condition | Selected execution |
| --- | --- | --- |
| 1 | `COMPOSE_BIN` is set | Use the supplied Compose override before any automatic engine selection. |
| 2 | Windows, no override, and `docker` is on PATH | Run `docker compose` natively on Windows. Do not convert paths or forward through WSL. |
| 3 | Windows, no override, and `docker` is absent | Use WSL and run `podman compose` inside it. |
| 4 | Linux, no override, and `podman` is available | Run `podman compose` directly. This includes a process already running inside WSL. |
| 5 | Linux, no override, and `podman` is absent | Run `docker compose` directly. |

Print which engine/execution location was selected before invocation, including when the explicit override wins. Do not print credentials or secret environment values. Once an engine is selected, propagate its actual exit status and failures; do not silently switch engines after a daemon, Compose-provider, or application error.

Select the Compose path before the existing generic Windows-to-WSL relay. A native Windows Docker invocation must not pass through Bash or WSL. Keep argument boundaries, quoted paths, working-directory semantics, signals, and environment forwarding correct; do not interpolate caller arguments into evaluated shell code. Preserve WSL path conversion only for the WSL fallback.

The requested selection policy applies to Compose actions. Other npm install/update/test/dev launchers may retain their WSL handling for Linux-installed Node dependencies; do not silently force all npm work to Windows merely because Docker is available.

If the selected engine or its required Compose provider is unavailable, fail clearly with the chosen path and the missing prerequisite. Do not install Docker Desktop, restart WSL, change privileges, or alter unrelated containers as a fallback.

## Engine Verification

This machine has no Docker Desktop. Verify native command dispatch with a non-destructive stub supplied through `COMPOSE_BIN`, recording arguments, working directory, selected-engine output and exit status. The stub must not start/stop containers or require a daemon. Test that an override wins even when automatic probes would prefer another engine.

Separately test the selector with controlled platform/PATH probes for Windows Docker-present, Windows Docker-absent, Linux Podman-present, and Linux Podman-absent cases. Verify native Windows selection does not invoke WSL, and WSL selection happens only for the Windows fallback. Include a path-with-spaces/argument-boundary case and nonzero child exit propagation.

The override/stub checks verify the native dispatch code path, not a real Docker Desktop installation or Docker daemon. Report that limitation explicitly rather than calling Docker Desktop integration tested. Verify actual direct Podman Compose configuration/startup on the available WSL environment and compare the direct and shortcut service selections.

## JetStream and Cutover

Use matching maintained modular NATS clients, a file-backed stream, and independent durable explicit-ack consumers per service group and subject. Preserve subjects/payloads, wait for persistence acknowledgements on publish, await handlers/listener readiness, retry failures, and drain on shutdown. Preserve at-least-once semantics without claiming exactly-once or adding an unrequested outbox.

STAN histories and durable subscription positions are not JetStream state. Preserve existing data; document coordinated publisher quiescence, draining and projection/job reconciliation before a real cutover. Do not perform automatic historical conversion, a mixed STAN/JetStream rolling deployment, or destructive volume cleanup.

## Development and Verification

Support full development containers and infrastructure-only containers with local source watchers. The shared development backend build remains in common/Dockerfile and the client image runs Next development. No public TLS/deployment work, production images or production Compose are in scope.

All package test specs/helpers/mocks belong in test/ beside src/; retain the existing root/common/client external test folders. Update discovery and typechecks without weakening tests. Root and service READMEs describe the actual implementation and verified commands, with direct Compose first and optional npm/VS Code shortcuts second.

Verify the complete root test gate, independent broker replay/resume/redelivery, desktop/mobile browser reservation/cancellation, focused accessibility checks and local watchers. Report actual Docker Desktop and remote GitHub Actions as unverified when unavailable; stub/local coverage is not equivalent to either.
