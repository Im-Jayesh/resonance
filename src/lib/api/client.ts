import { toast } from "sonner";

export async function apiClient<T>(
  promise: Promise<T>,
  options: {
    successMessage?: string;
    errorMessage?: string;
  } = {}
): Promise<T> {
  try {
    const data = await promise;
    if (options.successMessage) {
      toast.success(options.successMessage);
    }
    return data;
  } catch (error) {
    const message = options.errorMessage || (error as Error).message || "Something went wrong";
    toast.error(message);
    throw error;
  }
}
