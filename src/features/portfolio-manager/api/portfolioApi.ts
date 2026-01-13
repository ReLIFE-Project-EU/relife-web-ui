/**
 * Portfolio API - CRUD operations for portfolios.
 */

import { supabase } from "../../../auth";
import { STORAGE_BUCKET } from "../constants";
import type { Portfolio, PortfolioRow } from "../types";

/**
 * Transform database row to Portfolio interface
 */
function toPortfolio(row: PortfolioRow): Portfolio {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fileCount: row.portfolio_files?.[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const portfolioApi = {
  /**
   * List all portfolios for the current user
   */
  async list(): Promise<Portfolio[]> {
    const { data, error } = await supabase
      .from("portfolios")
      .select(
        `
        id,
        name,
        description,
        created_at,
        updated_at,
        portfolio_files(count)
      `,
      )
      .order("name");

    if (error) throw error;
    return (data as PortfolioRow[]).map(toPortfolio);
  },

  /**
   * Create a new portfolio
   */
  async create(name: string, description?: string): Promise<Portfolio> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("portfolios")
      .insert({
        user_id: user.id,
        name,
        description: description ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      fileCount: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Rename a portfolio
   */
  async rename(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from("portfolios")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Update portfolio description
   */
  async updateDescription(
    id: string,
    description: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from("portfolios")
      .update({ description, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Delete a portfolio and all its files
   */
  async delete(id: string): Promise<void> {
    // First, get all files in the portfolio
    const { data: files } = await supabase
      .from("portfolio_files")
      .select("storage_path")
      .eq("portfolio_id", id);

    // Delete files from storage if any exist
    if (files && files.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(files.map((f) => f.storage_path));

      if (storageError) {
        console.error("Failed to delete storage files:", storageError);
        // Continue with portfolio deletion - files table will cascade delete
      }
    }

    // Delete the portfolio (cascade deletes file records)
    const { error } = await supabase.from("portfolios").delete().eq("id", id);

    if (error) throw error;
  },
};
