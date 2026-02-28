import { supabase } from "./client";

export const createBoard = async () => {
  const { data, error } = await supabase
    .from("boards")
    .insert({})
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
};
