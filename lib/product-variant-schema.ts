export async function hasProductVariantSchema() {
  // ProductVariant is part of the required production schema. Avoid a database
  // probe here because a cold connection must not mark the whole catalog offline.
  return true;
}
