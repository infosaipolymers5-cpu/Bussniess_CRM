# Feature Modules

Each feature owns its screens, client query hooks, client-side input schemas and non-authoritative view models. Server mutations flow through typed API clients. Cross-feature behavior belongs in a server domain module or a shared, explicitly owned contract—never copied between screens.

