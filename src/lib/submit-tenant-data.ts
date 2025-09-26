export const submitTenantData = async (data: any) => {
  try {
    const response = await fetch(
      "https://7c8ctvqarg.execute-api.us-west-2.amazonaws.com/submit-tenant-data",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    const responseData = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: responseData.message,
      };
    } else {
      return {
        success: false,
        message: "An error occurred",
      };
    }
  } catch (err) {
    console.error("Lambda error:", err);
    return {
      success: false,
      message: "Failed to call Lambda",
    };
  }
};

