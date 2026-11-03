# dxckie-cell plugins for Valenced

Eighteen Valenced plugins in one repository.

## Install

Add this repository in Valenced's plugin repository settings:

https://dxckie-cell.github.io/valenced-plugins

Then install the plugins you want and reload Valenced.

## Plugins

| Plugin | ID | What it does |
|---|---|---|
| BetterInvites | `dxckie.better-invites` | See invite expiry, view the inviter's profile and preview servers before joining. Long-press a message with an invite link and tap **Invite info**. |
| CopyStatus | `dxckie.copystatus` | Long-press a user's custom status on their profile to select and copy the text. |
| Show Images Link | `dxckie.image-link` | Keeps the link text visible when a message is just a linked image or gif. |
| HideMessages | `dxckie.hide-messages` | Temporarily hide messages until you restart. |
| Override User Avatars | `dxckie.override-user-avatars` | Set a custom profile picture for any Discord user. |
| Override User Banners | `dxckie.override-user-banners` | Set a custom profile banner for any Discord user. |
| Override Server Appearance | `dxckie.override-server-appearance` | Set a custom icon and banner for any Discord server, only on your device. |
| Discord Editor | `dxckie.discord-editor` | Change the official Discord account's name, picture, banner, name color and bot badge. |
| Clyde Editor | `dxckie.clyde-editor` | Change Clyde's name, picture, banner, name color and bot badge. |
| Local Pins | `dxckie.local-pins` | Pin messages locally and browse them in a channel's Pins tab. |
| Read All+ | `dxckie.read-all-plus` | Adds an eye button to the guild bar that marks unread servers and DMs as read, with per-server and per-DM exclusions. |
| Badges Spoof | `dxckie.badges-spoof` | Adds Early Supporter, HypeSquad Events, Moderator Programs Alumni, Partnered Server Owner, Bug Hunter, Golden Bug Hunter, Early Verified Bot Developer, Discord Staff, Gifting and Server Boosting badges to your own profile, only on your device. Hide, show or move them (Go Left / Go Right) from the long-press menu in Edit Profile. |
| Username Spoof | `dxckie.username-spoof` | Change your own username and display name, only on your device. Set the names in the plugin settings. |
| Account Date Spoof | `dxckie.account-date-spoof` | Change the Member Since date on your own profile, only on your device. Set the date as DD-MM-YYYY in the plugin settings. |
| Spotify Preview | `dxckie.spotify-preview` | Tap a Spotify track, album, playlist or episode link to preview 30 seconds of it in a bottom sheet instead of leaving Discord. Port of fres's Vendetta plugin. |
| BioEmojiContext | `dxckie.bio-emoji-context` | Tap a custom emoji in someone's profile bio to open Discord's emoji sheet, like tapping one in chat. Plugins that add to that sheet, such as Expression Utils, show their buttons here too. |
| No Compression | `dxckie.no-compression` | Stops Discord from compressing images and files when you upload them. Port of MSMA's Vendetta plugin. |
| Picture Links+ | `dxckie.picture-links` | Tap profile pictures, profile banners, and server icons and banners to view them full size. Long-press a profile picture to open its server avatar. Port of dxckie-cell's Vendetta plugin Picture Links+, based on Picture Links by redstonekasi and Rico040 (CC0). |

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
