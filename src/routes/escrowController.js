export const handleEscrowEvent = async (gateway, event) => {
  console.log(`[Escrow Event Received] from ${gateway}:`, event.event);
  // TODO: implement escrow logic later
  return true;
};
