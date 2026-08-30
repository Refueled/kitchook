const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();

  try {
    if (!document.execCommand('copy')) throw new Error('copy command was rejected');
  } finally {
    input.remove();
  }
};

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-deployment-copy]')) {
  const deploymentId = button.dataset.deploymentId;
  const tooltip = button.querySelector<HTMLElement>('[data-deployment-tooltip]');
  const status = button.parentElement?.querySelector<HTMLElement>('[data-deployment-status]');
  let resetTimer: number | undefined;

  if (!deploymentId || !tooltip || !status) continue;

  const defaultMessage = tooltip.textContent ?? '';

  button.addEventListener('click', async () => {
    window.clearTimeout(resetTimer);

    try {
      await copyText(deploymentId);
      tooltip.textContent = `Copied ${deploymentId}`;
      status.textContent = `Copied deployment identifier ${deploymentId} to the clipboard.`;
    } catch {
      tooltip.textContent = `Copy failed — ${deploymentId}`;
      status.textContent = `Could not copy the deployment identifier. It is ${deploymentId}.`;
    }

    resetTimer = window.setTimeout(() => {
      tooltip.textContent = defaultMessage;
      status.textContent = '';
    }, 3000);
  });
}
