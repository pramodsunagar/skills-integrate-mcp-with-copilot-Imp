import re

def is_valid_email(email):
    """
    Validates the given email address.

    Args:
        email (str): The email address to validate.

    Returns:
        bool: True if valid, False otherwise.
    """
    # Basic regex pattern for validating an email
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return re.match(pattern, email) is not None

# Example usage:
if __name__ == "__main__":
    user_email = input("Enter your email: ").strip()
    if is_valid_email(user_email):
        print("Valid email address.")
    else:
        print("Invalid email address.")
