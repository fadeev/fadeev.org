// Give the poster a paint on direct visits, and let the shelf animation
// finish before decoding a model or allocating GPU resources.
export async function afterNavigation() {
  do {
    const navigation = routeFinished;
    await navigation.catch(() => {});
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (navigation === routeFinished) return;
  } while (true);
}
