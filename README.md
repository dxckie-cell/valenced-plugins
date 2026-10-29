# dxckie-cell plugins for Valenced

Ten Valenced plugins in one repository.

## Install

Add this repository in Valenced's plugin repository settings:

https://dxckie-cell.github.io/valenced-plugins

Then install the plugins you want and reload Valenced.

## Plugins

| Plugin | ID | What it does |
|---|---|---|
| BetterInvites | `dxckie.better-invites` | See invite expiry, view the inviter's profile and preview servers before joining. Long-press a message with an invite link and tap **Invite info**. |
| CopyStatus | `dxckie.copystatus` | Long-press a user's custom status on their profile to select and copy the text. |
| HideMessages | `dxckie.hide-messages` | Temporarily hide messages until you restart. |
| Override User Avatars | `dxckie.override-user-avatars` | Set a custom profile picture for any Discord user. |
| Override User Banners | `dxckie.override-user-banners` | Set a custom profile banner for any Discord user. |
| Override Server Appearance | `dxckie.override-server-appearance` | Set a custom icon and banner for any Discord server, only on your device. |
| Discord Editor | `dxckie.discord-editor` | Change the official Discord account's name, picture, banner, name color and bot badge. |
| Clyde Editor | `dxckie.clyde-editor` | Change Clyde's name, picture, banner, name color and bot badge. |
| Local Pins | `dxckie.local-pins` | Pin messages locally and browse them in a channel's Pins tab. |
| Read All Plus | `dxckie.read-all-plus` | Adds an eye button to the guild bar that marks unread servers and DMs as read, with per-server and per-DM exclusions. |

## Development

```sh
bun install
bun run package
bun run serve
```

Add the repository URL printed by the server to Valenced on your device. The device must be able to reach your computer.

```sh
bun run lint:types
bunx biome check plugins scripts
```

## Releasing

Bump `version` in a plugin's `plugins/<name>/manifest.json` and push to `main`. The Release workflow builds the plugin, publishes it to the `gh-pages` pool and redeploys the repository index.

Licensed under GPL-3.0.
