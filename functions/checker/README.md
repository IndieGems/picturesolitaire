# checker

A Gem serverless function: this crate builds into one WebAssembly component, which the platform
runs when your game calls it. `src/lib.rs` is yours to change. `wit/world.wit` is the platform's
and must stay exactly as it is; when `gemctl project doctor` says it is out of date,
`gemctl project doctor --fix --only function.world` writes the current one.

Run these from this folder, inside your game's project, signed in with `gemctl auth login`.
gemctl never builds anything for you: the `cargo` step is yours.

```sh
gemctl setup wasm-target   # once per machine: the Rust target this builds for
cargo build --release --target wasm32-unknown-unknown
gemctl function package target/wasm32-unknown-unknown/release/checker.wasm
gemctl function upload --file target/wasm32-unknown-unknown/release/checker.component.wasm --version 0.1.0 --channel dev
gemctl function invoke --data '{"score":120}'
```

1. **Build** the core module with cargo.
2. **Package** wraps it into the component the platform takes, then checks it the way publishing
   will. A refusal says what to change.
3. **Upload** stores it as version `0.1.0` and points the `dev` channel at it. A version is used
   once per game, so upload a new one to change what runs.
4. **Invoke** calls `dev`'s function as you and prints the call's `invocation_id`;
   `gemctl function logs --invocation-id <id>` shows what that call logged. The call is real:
   whatever the function writes or grants, it does, to your account.

The guide to what a function can do, and how to publish it to testers and players, is
[`serverless-functions.md`](../../node_modules/@indiegems/gem-web-sdk/docs/serverless-functions.md) in the Gem Web SDK package your game installs
(`node_modules/@indiegems/gem-web-sdk/docs/`).
