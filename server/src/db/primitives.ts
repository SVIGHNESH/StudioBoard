import type { Primitive } from "../../../shared/types/primitives";
import { supabase } from "./client";

export const getBoardPrimitives = async (boardId: string): Promise<Primitive[]> => {
  const { data, error } = await supabase
    .from("primitives")
    .select("id, type, data, created_by, deleted_at")
    .eq("board_id", boardId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) =>
    ({
      id: row.id,
      type: row.type,
      createdBy: row.created_by,
      ...(row.data as Record<string, unknown>),
    } as Primitive)
  );
};

export const insertPrimitive = async (boardId: string, primitive: Primitive) => {
  const { id, type, createdBy, ...data } = primitive;
  const { data: stored, error } = await supabase
    .from("primitives")
    .insert({
      id,
      board_id: boardId,
      type,
      data,
      created_by: createdBy,
    })
    .select("id, type, data, created_by")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: stored.id,
    type: stored.type,
    createdBy: stored.created_by,
    ...(stored.data as Omit<Primitive, "id" | "type" | "createdBy">),
  } as Primitive;
};

export const updatePrimitive = async (
  id: string,
  changes: Partial<Primitive> & { deleted_at?: string | null }
): Promise<boolean> => {
  if (Object.keys(changes).length === 0) {
    return true;
  }

  const payload: Record<string, unknown> = {};

  if ("deleted_at" in changes) {
    payload.deleted_at = changes.deleted_at;
  }

  const { id: _id, type: _type, createdBy: _createdBy, deleted_at: _deleted, ...rest } = changes as Partial<
    Primitive & { deleted_at?: string | null }
  >;

  if (Object.keys(rest).length > 0) {
    const { data: existing, error: fetchError } = await supabase
      .from("primitives")
      .select("data")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    payload.data = { ...(existing?.data as Record<string, unknown>), ...rest };
  }

  const { error } = await supabase.from("primitives").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  return true;
};

export const softDeletePrimitive = async (id: string) => {
  const { error } = await supabase
    .from("primitives")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};
