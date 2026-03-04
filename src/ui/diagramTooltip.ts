import type { NodeSingular } from 'cytoscape';

export function showNodeTooltip(
  container: HTMLElement,
  node: NodeSingular,
  doc: Document
): void {
  const data = node.data();
  const position = node.renderedPosition();

  // Create or get tooltip element
  let tooltip = container.querySelector('.diagram-tooltip') as HTMLElement;
  if (!tooltip) {
    tooltip = doc.createElement('div');
    tooltip.className = 'diagram-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.maxWidth = '200px';
    container.appendChild(tooltip);
  }

  // Set tooltip content
  const fileCount = data.fileCount || data.filePaths?.length || 0;
  tooltip.innerHTML = `
      <div><strong>${data.label}</strong></div>
      <div>Type: ${data.type}</div>
      <div>Files: ${fileCount}</div>
      ${data.language ? `<div>Language: ${data.language}</div>` : ''}
    `;

  // Position tooltip
  tooltip.style.left = `${position.x + 10}px`;
  tooltip.style.top = `${position.y - 10}px`;
  tooltip.style.display = 'block';
}

export function hideNodeTooltip(container: HTMLElement): void {
  const tooltip = container.querySelector('.diagram-tooltip') as HTMLElement;
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}
