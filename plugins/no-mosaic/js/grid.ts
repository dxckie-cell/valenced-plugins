/** Turns off the attachment grid on a message content object and returns the object to use. */
export function disableGrid<T>(content: T): T {
	if (!content || typeof content !== 'object' || !('useAttachmentGridLayout' in content)) return content
	const c = content as { useAttachmentGridLayout: unknown }
	try {
		c.useAttachmentGridLayout = false
	} catch {}
	// A frozen object ignores or rejects the write, so hand back a copy instead.
	return c.useAttachmentGridLayout === false ? content : ({ ...content, useAttachmentGridLayout: false } as T)
}
