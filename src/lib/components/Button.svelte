<script lang="ts">
	// A button in zed.dev's style: solid accent fill with a darker inset bottom
	// rim (a subtle bevel, flattened on hover/press), monospace label, an
	// optional leading icon, and an optional trailing `<kbd>` letter badge —
	// modelled on zed.dev's "Download now" button (icon + "D" shortcut kbd).
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary';

	type Props = {
		icon?: Snippet | null;
		letter?: string | null;
		variant?: Variant;
		href?: string;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	};

	let {
		icon = null,
		letter = null,
		variant = 'primary',
		href,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	let el: HTMLAnchorElement | HTMLButtonElement | undefined = $state();

	const isEditableTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof HTMLElement)) {
			return false;
		}
		return (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.isContentEditable
		);
	};

	// Pressing the bare letter key acts like a click on this button, mirroring
	// the `<kbd>` hint it displays — mimics zed.dev's "Download now" shortcut.
	$effect(() => {
		if (!letter) {
			return;
		}
		const key = letter.toLowerCase();

		const onKeydown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== key) {
				return;
			}
			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			if (isEditableTarget(event.target)) {
				return;
			}
			if (!el || el.getAttribute('aria-disabled') === 'true') {
				return;
			}
			event.preventDefault();
			el.click();
		};

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

{#if href}
	<!-- href is caller-resolved: this is a generic primitive, used for both internal routes (already wrapped in resolve() by the caller) and external URLs. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a bind:this={el} class="btn btn--{variant} {className}" class:has-kbd={!!letter} {href} {...rest}>
		{#if icon}
			<span class="btn__icon">{@render icon()}</span>
		{/if}
		<span class="btn__label">{@render children()}</span>
		{#if letter}
			<kbd class="btn__kbd" aria-hidden="true">{letter}</kbd>
		{/if}
	</a>
{:else}
	<button bind:this={el} class="btn btn--{variant} {className}" class:has-kbd={!!letter} {...rest}>
		{#if icon}
			<span class="btn__icon">{@render icon()}</span>
		{/if}
		<span class="btn__label">{@render children()}</span>
		{#if letter}
			<kbd class="btn__kbd" aria-hidden="true">{letter}</kbd>
		{/if}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 36px;
		padding: 0 12px 0 10px;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		white-space: nowrap;
		text-decoration: none;
		cursor: pointer;
		user-select: none;
		transition:
			background-color var(--transition-fast),
			box-shadow var(--transition-fast);
	}

	.btn.has-kbd {
		padding-right: 6px;
	}

	.btn:active {
		transform: translateY(1px) scale(0.99);
	}

	.btn:disabled,
	.btn[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.btn--primary {
		background: var(--accent);
		color: var(--accent-contrast);
		box-shadow:
			inset 0 -2px 0 0 color-mix(in oklab, var(--accent) 60%, black),
			0 1px 3px 0 rgba(0, 0, 0, 0.4);
	}

	.btn--primary:hover,
	.btn--primary:active {
		background: var(--accent-hover);
		box-shadow: none;
	}

	.btn--secondary {
		background: var(--surface);
		border-color: var(--border);
		color: var(--fg);
		box-shadow: inset 0 -2px 0 0 color-mix(in oklab, var(--fg) 8%, transparent);
	}

	.btn--secondary:hover {
		background: var(--surface-hover);
		box-shadow: none;
	}

	.btn__icon {
		display: inline-flex;
		width: 1em;
		height: 1em;
		flex-shrink: 0;
	}

	.btn__icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.btn__kbd {
		display: none;
		align-items: center;
		height: 20px;
		padding-inline: 6px;
		border: 1px solid color-mix(in oklab, currentColor 20%, transparent);
		border-radius: 2px;
		background: color-mix(in oklab, currentColor 12%, transparent);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		line-height: 1;
		color: inherit;
	}

	@media (min-width: 640px) {
		.btn__kbd {
			display: flex;
		}
	}
</style>
