import { CosmosClient, Container } from "@azure/cosmos";

interface ProductRepoOptions {
  endpoint: string;
  databaseId: string;
  containerId: string;
  partitionKey: string;
  key?: string; // Optional access-key authentication
}

// Internal DTO for Cosmos DB
interface ProductDTO {
  id: string;
  name: string;
  description: string;
}

// Domain Entity
export interface Product {
  id: string;
  name: string;
  description: string;
}

export class ProductRepo {
  private readonly container: Container;

  constructor(private readonly options: ProductRepoOptions) {
    const client = new CosmosClient({
      endpoint: options.endpoint,
      key: options.key,
    });

    const database = client.database(options.databaseId);
    this.container = database.container(options.containerId);
  }

  private toDTO(product: Product): ProductDTO {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
    };
  }

  private toDomain(dto: ProductDTO): Product {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
    };
  }

  async save(product: Product): Promise<void> {
    const dto = this.toDTO(product);
    try {
      // Cosmos infers partition key automatically from the item
      await this.container.items.upsert(dto);
    } catch (error) {
      console.error("Failed to save product:", error);
      throw error;
    }
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const { resource } = await this.container
        .item(id, this.options.partitionKey)
        .read<ProductDTO>();
      return resource ? this.toDomain(resource) : null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("Failed to fetch product by ID:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.container.item(id, this.options.partitionKey).delete();
    } catch (error: any) {
      if (error.code === 404) {
        return; // Gracefully handle not found
      }
      console.error("Failed to delete product:", error);
      throw error;
    }
  }

  async list(): Promise<Product[]> {
    const query = "SELECT * FROM c";
    try {
      const { resources } = await this.container.items
        .query<ProductDTO>(query)
        .fetchAll();
      return resources.map((r) => this.toDomain(r));
    } catch (error) {
      console.error("Failed to list products:", error);
      throw error;
    }
  }
}
