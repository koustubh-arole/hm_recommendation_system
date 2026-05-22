import type { Product } from "@/types";

export function normaliseProduct(raw: Record<string, unknown>): Product {
  const articleId = String(
    raw.article_id || raw.id || raw.articleId || ""
  ).replace(/^0+/, "");

  return {
    id:                 String(articleId),
    article_id:         String(articleId),
    product_name:       String(
      raw.product_name ||
      raw.prod_name ||
      raw.name ||
      (raw.metadata as Record<string, unknown>)?.product_name ||
      raw.document ||
      "Unknown product"
    ),
    product_type_name:  String(
      raw.product_type_name ||
      raw.product_group_name ||
      (raw.metadata as Record<string, unknown>)?.product_type_name ||
      ""
    ),
    product_group_name: String(raw.product_group_name || ""),
    colour_group_name:  String(
      raw.colour_group_name ||
      raw.colour ||
      (raw.metadata as Record<string, unknown>)?.colour_group_name ||
      ""
    ),
    section_name:       String(
      raw.section_name ||
      raw.section ||
      (raw.metadata as Record<string, unknown>)?.section_name ||
      ""
    ),
    index_name:         String(raw.index_name || ""),
    detail_desc:        raw.detail_desc != null ? String(raw.detail_desc) : undefined,
    purchase_count:     raw.purchase_count != null ? Number(raw.purchase_count) : undefined,
    score:              raw.score != null ? Number(raw.score) : undefined,
    cluster:            raw.cluster != null ? Number(raw.cluster) : undefined,
    price:              raw.price != null ? Number(raw.price) : undefined,
  };
}