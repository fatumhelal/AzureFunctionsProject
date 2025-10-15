import { Product } from "./product";

export interface ProductRepo {
  create(product: Product): Promise<void>;
  get(id: string): Promise<Product | null>;
}
