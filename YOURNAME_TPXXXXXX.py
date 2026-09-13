# NAME1_NAME2_NAME3
# TP000001, TP000002, TP000003
# ---------------------------------------------------------------------------
# CT108-3-1-PYP  Python Programming - Individual Assignment
# BANKING SERVICE SYSTEM
# ---------------------------------------------------------------------------
# Modules permitted by the assignment brief: os and datetime only.
# No global variables are used anywhere in this program. All state is passed
# between functions as parameters or read from / written to text files.
# ---------------------------------------------------------------------------

import os
import datetime


# ===========================================================================
# SECTION 1 - CONFIGURATION HELPERS
# ---------------------------------------------------------------------------
# Constants are returned by functions rather than declared at module level so
# that the program contains no global variables, as required by the brief.
# ===========================================================================

def admin_file():
    """Return the name of the text file that stores admin accounts."""
    return "admins.txt"


def staff_file():
    """Return the name of the text file that stores staff accounts."""
    return "staff.txt"


def customer_file():
    """Return the name of the text file that stores customer accounts."""
    return "customers.txt"


def transaction_file():
    """Return the name of the text file that stores every transaction."""
    return "transactions.txt"


def delimiter():
    """Return the character used to separate fields inside a text record."""
    return "|"


def admin_fields():
    """Return the ordered field names of an admin record."""
    return ["id", "name", "email", "password"]


def staff_fields():
    """Return the ordered field names of a staff record."""
    return ["id", "name", "email", "password"]


def customer_fields():
    """
    Return the ordered field names of a customer account record.

    Every customer is stored using the same eight fields regardless of
    account type, so that one set of file-handling functions can serve both
    Savings and Current accounts.
    """
    return ["account_number", "name", "email", "phone",
            "account_type", "balance", "password", "date_opened"]


def transaction_fields():
    """Return the ordered field names of a transaction record."""
    return ["account_number", "date", "type", "amount", "balance_after"]


def admin_pos(field_name):
    """Return the list index of a named field in an admin record."""
    return admin_fields().index(field_name)


def staff_pos(field_name):
    """Return the list index of a named field in a staff record."""
    return staff_fields().index(field_name)


def cust_pos(field_name):
    """Return the list index of a named field in a customer record."""
    return customer_fields().index(field_name)


def txn_pos(field_name):
    """Return the list index of a named field in a transaction record."""
    return transaction_fields().index(field_name)


def minimum_password_length():
    """Return the minimum number of characters accepted in a password."""
    return 6


def maximum_login_attempts():
    """Return the number of failed logins allowed before the system exits."""
    return 3


def minimum_balance(account_type):
    """
    Return the minimum balance a customer's account must never fall below.

    The brief singles this rule out: Savings accounts must keep at least
    RS 1000.00 and Current accounts at least RS 1500.00 at all times.
    """
    if account_type == "Savings":
        return 1000.00
    return 1500.00


def default_customer_password():
    """Return the default password issued to a newly registered customer."""
    return "welcome123"


# ===========================================================================
# SECTION 2 - SCREEN AND DISPLAY UTILITIES
# ===========================================================================

def clear_screen():
    """Clear the terminal window on either Windows or Unix-based systems."""
    os.system("cls" if os.name == "nt" else "clear")


def line(width=70):
    """Return a horizontal rule used to frame headings and tables."""
    return "=" * width


def show_header(title):
    """Display a framed, centred heading at the top of a screen."""
    clear_screen()
    print(line())
    print(title.center(70))
    print(line())


def show_message(message, symbol="*"):
    """Display a single feedback message in a consistent format."""
    print("\n" + symbol + " " + message)


def pause():
    """Hold the screen until the user presses Enter."""
    input("\nPress Enter to continue...")


def today_string():
    """Return the current date as a printable YYYY-MM-DD string."""
    return datetime.datetime.now().strftime("%Y-%m-%d")


def now_string():
    """Return the current date and time as a printable string."""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M")


def format_money(amount):
    """Return a numeric amount formatted as a two-decimal money string."""
    return "%.2f" % float(amount)


# ===========================================================================
# SECTION 3 - FILE HANDLING (READ / WRITE / APPEND)
# ===========================================================================

def ensure_data_files():
    """
    Create any missing data file and seed default accounts.

    The system cannot be entered without at least one admin, so on the very
    first run a default admin account is written. Sample staff and customer
    accounts are also seeded so the system can be demonstrated immediately.
    """
    for name in (admin_file(), staff_file(), customer_file(), transaction_file()):
        if not os.path.exists(name):
            handle = open(name, "w")
            handle.close()

    if len(read_records(admin_file())) == 0:
        append_record(admin_file(), ["A001", "System Admin",
                                     "admin@bank.com", "admin123"])

    if len(read_records(staff_file())) == 0:
        append_record(staff_file(), ["S001", "Front Office Staff",
                                     "staff@bank.com", "staff123"])

    if len(read_records(customer_file())) == 0:
        append_record(customer_file(), ["10001", "Rohan Sharma",
                                        "rohan@example.com", "0123456789",
                                        "Savings", "6000.00",
                                        "rohan2026", today_string()])
        append_record(customer_file(), ["10002", "Priya Nair",
                                        "priya@example.com", "0123456780",
                                        "Current", "9000.00",
                                        "pass0002", today_string()])
        append_record(customer_file(), ["10003", "Wei Ling",
                                        "weiling@example.com", "0123456781",
                                        "Savings", "3000.00",
                                        "pass0003", today_string()])


def read_records(filename):
    """
    Read a text file and return its contents as a nested list.

    Each line of the file becomes one inner list, and each delimited field
    becomes one element of that inner list. Blank lines are ignored so that
    a trailing newline never produces an empty record.
    """
    records = []
    if not os.path.exists(filename):
        return records

    handle = open(filename, "r")
    for raw_line in handle:
        cleaned = raw_line.strip()
        if cleaned != "":
            records.append(cleaned.split(delimiter()))
    handle.close()
    return records


def write_records(filename, records):
    """
    Overwrite a text file with a nested list of records.

    Used after an edit, where the whole file must be rebuilt.
    """
    handle = open(filename, "w")
    for record in records:
        handle.write(delimiter().join(record) + "\n")
    handle.close()


def append_record(filename, record):
    """Add a single record to the end of a text file."""
    handle = open(filename, "a")
    handle.write(delimiter().join(record) + "\n")
    handle.close()


# ===========================================================================
# SECTION 4 - VALIDATED INPUT
# ---------------------------------------------------------------------------
# Every value entered by a user passes through one of these functions, so no
# invalid or malformed data can ever reach the data files.
# ===========================================================================

def ask_text(prompt, minimum_length=1, allow_digits=True):
    """
    Read a non-empty line of text, re-prompting until the entry is valid.

    The delimiter character is rejected because it would corrupt the record
    structure of the text files.
    """
    while True:
        value = input(prompt).strip()

        if len(value) < minimum_length:
            show_message("Entry must be at least %d character(s) long."
                         % minimum_length)
            continue
        if delimiter() in value:
            show_message("The '%s' character is not allowed." % delimiter())
            continue
        if not allow_digits and not all(part.isalpha() for part in value.split()):
            show_message("Only letters and spaces are allowed here.")
            continue

        return value


def ask_phone(prompt):
    """Read a phone number made up only of digits, 7 to 15 characters long."""
    while True:
        value = input(prompt).strip()

        if not value.isdigit():
            show_message("Phone number must contain digits only.")
            continue
        if len(value) < 7 or len(value) > 15:
            show_message("Phone number must be between 7 and 15 digits.")
            continue

        return value


def is_valid_email(value):
    """
    Check an email address against a set of structural rules.

    The brief permits only os and datetime, so no regular-expression module
    is available. The rules below are applied manually instead.
    """
    if value.count("@") != 1:
        return False

    local_part, domain_part = value.split("@")

    if local_part == "" or domain_part == "":
        return False
    if "." not in domain_part:
        return False
    if domain_part.startswith(".") or domain_part.endswith("."):
        return False
    if ".." in value or " " in value:
        return False
    if len(domain_part.split(".")[-1]) < 2:
        return False

    return True


def ask_email(prompt, existing_emails, current_email=""):
    """
    Read an email address, checking both its format and its uniqueness.

    When a user is editing their own profile, their current address is passed
    in as current_email so that keeping it unchanged is not reported as a
    duplicate.
    """
    while True:
        value = input(prompt).strip().lower()

        if not is_valid_email(value):
            show_message("Invalid email format. Example: name@bank.com")
            continue

        if value != current_email.lower() and value in [
                email.lower() for email in existing_emails]:
            show_message("That email is already registered to another user.")
            continue

        return value


def ask_password(prompt):
    """
    Read a password that meets the minimum strength rules.

    A password must reach the minimum length and contain at least one letter
    and one digit, which prevents trivially guessable credentials.
    """
    while True:
        value = input(prompt).strip()

        if len(value) < minimum_password_length():
            show_message("Password must be at least %d characters."
                         % minimum_password_length())
            continue
        if delimiter() in value or " " in value:
            show_message("Password cannot contain spaces or '%s'."
                         % delimiter())
            continue
        if not any(character.isalpha() for character in value):
            show_message("Password must contain at least one letter.")
            continue
        if not any(character.isdigit() for character in value):
            show_message("Password must contain at least one digit.")
            continue

        return value


def ask_amount(prompt):
    """Read a positive money amount and return it as a float."""
    while True:
        value = input(prompt).strip()

        try:
            amount = float(value)
        except ValueError:
            show_message("Amount must be a number, for example 500.00")
            continue

        if amount <= 0:
            show_message("Amount must be greater than zero.")
            continue

        return amount


def ask_date(prompt):
    """Read a calendar date in YYYY-MM-DD form and return it as a string."""
    while True:
        value = input(prompt).strip()

        try:
            datetime.datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            show_message("Date must be in YYYY-MM-DD form, for example "
                         "2026-01-31.")
            continue

        return value


def ask_choice(prompt, valid_options):
    """Read a menu selection and re-prompt until it is one of the options."""
    while True:
        value = input(prompt).strip()

        if value in valid_options:
            return value

        show_message("Invalid choice. Please select from %s."
                     % ", ".join(valid_options))


def ask_yes_no(prompt):
    """Read a confirmation and return True for yes, False for no."""
    answer = ask_choice(prompt + " (Y/N): ", ["Y", "y", "N", "n"])
    return answer.upper() == "Y"


# ===========================================================================
# SECTION 5 - RECORD SEARCHING AND IDENTIFIER GENERATION
# ===========================================================================

def next_account_number(customers):
    """
    Generate the next sequential account number.

    Account numbers start at 10001 and are never reused, because the
    transaction file refers to accounts by number: the highest existing
    number is found and one is added to it.
    """
    highest = 10000
    for customer in customers:
        number = int(customer[cust_pos("account_number")])
        if number > highest:
            highest = number
    return str(highest + 1)


def find_customer_by_account(customers, account_number):
    """Return the single customer with the given account number, or None."""
    for customer in customers:
        if customer[cust_pos("account_number")] == account_number:
            return customer
    return None


def find_staff_by_id(staff_list, identifier):
    """Return the single staff member with the given identifier, or None."""
    for staff in staff_list:
        if staff[staff_pos("id")].lower() == identifier.lower():
            return staff
    return None


def all_emails(admins, staff_list, customers):
    """Return every email address currently registered, across all roles."""
    emails = []
    for admin in admins:
        emails.append(admin[admin_pos("email")])
    for staff in staff_list:
        emails.append(staff[staff_pos("email")])
    for customer in customers:
        emails.append(customer[cust_pos("email")])
    return emails


def find_matches(records, position, search_value):
    """
    Return every record whose field at the given position matches the value.

    Matching is case-insensitive and exact, suitable for searching by ID,
    account number or email.
    """
    matches = []
    target = search_value.strip().lower()

    for record in records:
        if record[position].lower() == target:
            matches.append(record)

    return matches


# ===========================================================================
# SECTION 6 - DISPLAYING RECORDS
# ===========================================================================

def display_customer_table(customers, subtitle=""):
    """Display a list of customers as a formatted table with aligned columns."""
    if subtitle != "":
        print("\n" + subtitle)
    print(line())

    if len(customers) == 0:
        print("No records found.")
        print(line())
        return

    print("%-12s %-20s %-10s %-12s %-15s" %
          ("ACCOUNT NO.", "NAME", "TYPE", "BALANCE", "EMAIL"))
    print("-" * 70)

    for customer in customers:
        print("%-12s %-20s %-10s %-12s %-15s" % (
            customer[cust_pos("account_number")],
            customer[cust_pos("name")][:20],
            customer[cust_pos("account_type")],
            format_money(customer[cust_pos("balance")]),
            customer[cust_pos("email")][:15]))

    print(line())
    print("Total records: %d" % len(customers))


def display_customer_profile(customer):
    """Display every field of one customer record, with the password masked."""
    print("\n" + line())
    print("CUSTOMER ACCOUNT DETAILS".center(70))
    print(line())
    print("Account Number : %s" % customer[cust_pos("account_number")])
    print("Name           : %s" % customer[cust_pos("name")])
    print("Email          : %s" % customer[cust_pos("email")])
    print("Phone          : %s" % customer[cust_pos("phone")])
    print("Account Type   : %s" % customer[cust_pos("account_type")])
    print("Balance        : RS %s" % format_money(customer[cust_pos("balance")]))
    print("Date Opened    : %s" % customer[cust_pos("date_opened")])
    print("Password       : %s"
         % ("*" * len(customer[cust_pos("password")])))
    print(line())


def display_staff_table(staff_list, subtitle=""):
    """Display a list of staff as a formatted table with aligned columns."""
    if subtitle != "":
        print("\n" + subtitle)
    print(line())

    if len(staff_list) == 0:
        print("No records found.")
        print(line())
        return

    print("%-8s %-25s %-25s" % ("ID", "NAME", "EMAIL"))
    print("-" * 70)

    for staff in staff_list:
        print("%-8s %-25s %-25s" % (
            staff[staff_pos("id")],
            staff[staff_pos("name")][:25],
            staff[staff_pos("email")][:25]))

    print(line())
    print("Total records: %d" % len(staff_list))


# ===========================================================================
# SECTION 7 - AUTHENTICATION
# ===========================================================================

def authenticate_admin(identifier, password):
    """Check credentials against the stored admin records."""
    admins = read_records(admin_file())
    for admin in admins:
        if (admin[admin_pos("id")].lower() == identifier.lower()
                and admin[admin_pos("password")] == password):
            return admin
    return None


def authenticate_staff(identifier, password):
    """Check credentials against the stored staff records."""
    staff_list = read_records(staff_file())
    for staff in staff_list:
        if (staff[staff_pos("id")].lower() == identifier.lower()
                and staff[staff_pos("password")] == password):
            return staff
    return None


def authenticate_customer(account_number, password):
    """Check credentials against the stored customer records."""
    customers = read_records(customer_file())
    for customer in customers:
        if (customer[cust_pos("account_number")] == account_number
                and customer[cust_pos("password")] == password):
            return customer
    return None


def login(role, prompt_label, authenticate_function):
    """
    Run the login screen for one role.

    The brief requires the system to terminate after three failed attempts,
    so this function returns None only when the attempt limit is reached.
    """
    attempts_left = maximum_login_attempts()

    while attempts_left > 0:
        show_header("%s LOGIN" % role.upper())
        print("\nAttempts remaining: %d" % attempts_left)

        identifier = ask_text("\n%s : " % prompt_label)
        password = ask_text("Password  : ")

        user = authenticate_function(identifier, password)
        if user is not None:
            show_message("Login successful.")
            pause()
            return user

        attempts_left = attempts_left - 1
        if attempts_left > 0:
            show_message("Incorrect credentials. Please try again.")
            pause()

    return None


def terminate_system():
    """Display the termination notice required after three failed logins."""
    show_header("ACCESS DENIED")
    print("\nThree failed login attempts were recorded.")
    print("For security reasons the system is now terminating.")
    print("\n" + line())


# ===========================================================================
# SECTION 8 - CUSTOMER REGISTRATION AND MAINTENANCE (STAFF OPERATIONS)
# ===========================================================================

def register_customer():
    """
    Collect a new customer's registration form and open their account.

    The account number is autogenerated in sequence, and a default password
    is issued and shown to the staff member so it can be passed to the
    customer.
    """
    show_header("REGISTER NEW CUSTOMER")

    admins = read_records(admin_file())
    staff_list = read_records(staff_file())
    customers = read_records(customer_file())

    account_number = next_account_number(customers)
    print("\nThe system has assigned account number: %s" % account_number)

    name = ask_text("\nFull name          : ", 2, allow_digits=False)
    email = ask_email("Email              : ",
                      all_emails(admins, staff_list, customers))
    phone = ask_phone("Phone number       : ")
    account_type = ask_choice(
        "Account type (Savings/Current) : ", ["Savings", "Current"])
    opening_deposit = ask_amount("Opening deposit    : ")

    if opening_deposit < minimum_balance(account_type):
        show_message("Opening deposit must be at least RS %s for a %s "
                     "account." % (format_money(minimum_balance(account_type)),
                                   account_type))
        pause()
        return

    password = default_customer_password()

    new_customer = [account_number, name, email, phone, account_type,
                    format_money(opening_deposit), password, today_string()]

    print("\nPlease confirm the details below:")
    display_customer_profile(new_customer)

    if ask_yes_no("\nOpen this account?"):
        append_record(customer_file(), new_customer)
        record_transaction(account_number, "Opening Deposit",
                           opening_deposit, opening_deposit)
        show_message("Account %s opened successfully. Default password: %s"
                     % (account_number, password))
    else:
        show_message("Registration discarded. Nothing was saved.")

    pause()


def choose_search_field_customer():
    """Display the customer search-criteria menu and return the field name."""
    print("\nSearch by:")
    print("  1. Account Number")
    print("  2. Email")
    print("  3. Cancel")

    choice = ask_choice("\nSelect an option (1-3): ", ["1", "2", "3"])
    return {"1": "account_number", "2": "email", "3": ""}[choice]


def search_customers(title):
    """Search the customer file by account number or email."""
    show_header(title)

    field_name = choose_search_field_customer()
    if field_name == "":
        return

    search_value = ask_text("\nEnter the value to search for: ")
    customers = read_records(customer_file())
    matches = find_matches(customers, cust_pos(field_name), search_value)

    display_customer_table(matches, "SEARCH RESULTS FOR '%s'" % search_value)

    if len(matches) == 1:
        display_customer_profile(matches[0])

    pause()


def view_all_customers(title):
    """Display every registered customer."""
    show_header(title)
    customers = read_records(customer_file())
    display_customer_table(customers)
    pause()


def edit_customer_details():
    """
    Allow staff to update a customer's editable details.

    The account number and name are deliberately not editable, exactly as
    the brief requires: the account number identifies the record and is
    referenced by the transaction file, and the name must match the account
    holder's registration.
    """
    show_header("EDIT CUSTOMER DETAILS")

    account_number = ask_text("\nEnter the account number to edit: ")
    customers = read_records(customer_file())
    customer = find_customer_by_account(customers, account_number)

    if customer is None:
        show_message("No customer found with that account number.")
        pause()
        return

    working_copy = list(customer)

    while True:
        show_header("EDIT CUSTOMER - %s" % working_copy[cust_pos("name")])
        display_customer_profile(working_copy)

        print("\n  1. Email")
        print("  2. Phone number")
        print("  0. Save and return")

        choice = ask_choice("\nSelect the field to edit: ", ["0", "1", "2"])

        if choice == "0":
            break
        elif choice == "1":
            admins = read_records(admin_file())
            staff_list = read_records(staff_file())
            all_customers = read_records(customer_file())
            working_copy[cust_pos("email")] = ask_email(
                "New email          : ",
                all_emails(admins, staff_list, all_customers),
                customer[cust_pos("email")])
        elif choice == "2":
            working_copy[cust_pos("phone")] = ask_phone(
                "New phone number   : ")

        show_message("Field updated. Remember to save before returning.")
        pause()

    save_customer_changes(working_copy)
    show_message("Customer details have been saved.")
    pause()


def save_customer_changes(updated_customer):
    """Write an amended customer record back into the customer file in place."""
    customers = read_records(customer_file())

    for position in range(len(customers)):
        if (customers[position][cust_pos("account_number")]
                == updated_customer[cust_pos("account_number")]):
            customers[position] = updated_customer

    write_records(customer_file(), customers)


# ===========================================================================
# SECTION 9 - DEPOSITS, WITHDRAWALS AND TRANSACTIONS
# ===========================================================================

def record_transaction(account_number, txn_type, amount, balance_after):
    """Append one line to the transaction file for a deposit or withdrawal."""
    new_transaction = [account_number, now_string(), txn_type,
                       format_money(amount), format_money(balance_after)]
    append_record(transaction_file(), new_transaction)


def deposit(current_customer):
    """
    Deposit an amount into the signed-in customer's account.

    The balance is updated in the data file immediately after the deposit is
    confirmed.
    """
    show_header("DEPOSIT")

    amount = ask_amount("\nEnter amount to deposit : ")
    new_balance = float(current_customer[cust_pos("balance")]) + amount

    if not ask_yes_no("\nDeposit RS %s? New balance will be RS %s"
                      % (format_money(amount), format_money(new_balance))):
        show_message("Deposit cancelled.")
        pause()
        return current_customer

    current_customer[cust_pos("balance")] = format_money(new_balance)
    save_customer_changes(current_customer)
    record_transaction(current_customer[cust_pos("account_number")],
                       "Deposit", amount, new_balance)

    show_message("Deposit successful. New balance: RS %s"
                 % format_money(new_balance))
    pause()
    return current_customer


def withdraw(current_customer):
    """
    Withdraw an amount from the signed-in customer's account.

    The withdrawal is refused if it would breach the account type's minimum
    balance. Rather than simply failing, the customer is told the largest
    amount they may take instead.
    """
    show_header("WITHDRAW")

    account_type = current_customer[cust_pos("account_type")]
    balance = float(current_customer[cust_pos("balance")])
    floor = minimum_balance(account_type)
    available = balance - floor

    print("\nCurrent balance    : RS %s" % format_money(balance))
    print("Minimum balance    : RS %s" % format_money(floor))

    amount = ask_amount("\nEnter amount to withdraw : ")
    new_balance = balance - amount

    if new_balance < floor:
        if available > 0:
            show_message("Withdrawal refused: this would breach the "
                         "minimum balance. You may withdraw up to RS %s."
                         % format_money(available))
        else:
            show_message("Withdrawal refused: your balance is already at "
                         "or below the minimum balance of RS %s."
                         % format_money(floor))
        pause()
        return current_customer

    if not ask_yes_no("\nWithdraw RS %s? New balance will be RS %s"
                      % (format_money(amount), format_money(new_balance))):
        show_message("Withdrawal cancelled.")
        pause()
        return current_customer

    current_customer[cust_pos("balance")] = format_money(new_balance)
    save_customer_changes(current_customer)
    record_transaction(current_customer[cust_pos("account_number")],
                       "Withdrawal", amount, new_balance)

    show_message("Withdrawal successful. New balance: RS %s"
                 % format_money(new_balance))
    pause()
    return current_customer


# ===========================================================================
# SECTION 10 - STATEMENT OF ACCOUNT
# ===========================================================================

def transactions_for_account(account_number):
    """Return every transaction recorded against one account number."""
    all_transactions = read_records(transaction_file())
    return [txn for txn in all_transactions
            if txn[txn_pos("account_number")] == account_number]


def transaction_date(txn):
    """Return the calendar date (without time) of a transaction record."""
    return txn[txn_pos("date")].split(" ")[0]


def print_statement(account_number, customer_name):
    """
    Print a statement of account for a chosen period.

    A start and an end date are entered in YYYY-MM-DD form. One day is added
    to the end date internally so that the end of the period is inclusive,
    matching what a customer expects when they choose an end date.
    """
    show_header("STATEMENT OF ACCOUNT")
    print("\nAccount Number : %s" % account_number)
    print("Account Holder : %s" % customer_name)

    start_date = ask_date("\nStatement start date (YYYY-MM-DD) : ")
    end_date = ask_date("Statement end date   (YYYY-MM-DD) : ")

    start_bound = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    end_bound = (datetime.datetime.strptime(end_date, "%Y-%m-%d")
                + datetime.timedelta(days=1))

    all_transactions = transactions_for_account(account_number)
    period_transactions = []
    for txn in all_transactions:
        txn_time = datetime.datetime.strptime(transaction_date(txn),
                                              "%Y-%m-%d")
        if start_bound <= txn_time < end_bound:
            period_transactions.append(txn)

    print("\n" + line())
    print("Period : %s to %s" % (start_date, end_date))
    print(line())

    if len(period_transactions) == 0:
        print("No transactions were recorded in this period.")
        print(line())
        pause()
        return

    print("%-18s %-14s %-12s %-12s" %
          ("DATE", "TYPE", "AMOUNT", "BALANCE"))
    print("-" * 70)

    total_deposits = 0.0
    total_withdrawals = 0.0

    for txn in period_transactions:
        amount = float(txn[txn_pos("amount")])
        print("%-18s %-14s %-12s %-12s" % (
            txn[txn_pos("date")],
            txn[txn_pos("type")],
            format_money(amount),
            format_money(txn[txn_pos("balance_after")])))

        if txn[txn_pos("type")] in ("Withdrawal",):
            total_withdrawals += amount
        else:
            total_deposits += amount

    closing_balance = float(period_transactions[-1][txn_pos("balance_after")])

    print(line())
    print("TOTAL DEPOSITS    : RS %s" % format_money(total_deposits))
    print("TOTAL WITHDRAWALS : RS %s" % format_money(total_withdrawals))
    print("NET MOVEMENT      : RS %s"
         % format_money(total_deposits - total_withdrawals))
    print("CLOSING BALANCE   : RS %s" % format_money(closing_balance))
    print(line())
    pause()


def staff_print_statement_for_any_customer():
    """Let staff or admin generate the statement for any customer account."""
    show_header("GENERATE CUSTOMER STATEMENT")

    account_number = ask_text("\nEnter the customer's account number: ")
    customers = read_records(customer_file())
    customer = find_customer_by_account(customers, account_number)

    if customer is None:
        show_message("No customer found with that account number.")
        pause()
        return

    print_statement(account_number, customer[cust_pos("name")])


# ===========================================================================
# SECTION 11 - PROFILE AND PASSWORD MANAGEMENT
# ===========================================================================

def reset_own_password(records, filename, position_function, current_user):
    """
    Change the signed-in user's own password.

    The existing password must be re-entered first so that an unattended
    session cannot be used to lock the rightful owner out of the account.
    """
    show_header("CHANGE PASSWORD")

    old_password = ask_text("\nEnter your current password : ")
    if old_password != current_user[position_function("password")]:
        show_message("The current password is incorrect. Change cancelled.")
        pause()
        return current_user

    new_password = ask_password("Enter your new password     : ")
    confirmation = ask_text("Confirm your new password    : ")

    if new_password != confirmation:
        show_message("The two entries do not match. Change cancelled.")
        pause()
        return current_user

    if new_password == old_password:
        show_message("The new password must differ from the old one.")
        pause()
        return current_user

    updated_user = list(current_user)
    updated_user[position_function("password")] = new_password

    all_records = read_records(filename)
    key_position = 0
    for position in range(len(all_records)):
        if all_records[position][key_position] == updated_user[key_position]:
            all_records[position] = updated_user
    write_records(filename, all_records)

    show_message("Your password has been changed successfully.")
    pause()
    return updated_user


def edit_staff_details(current_admin):
    """Allow an admin to edit a staff member's name, email or password."""
    show_header("EDIT STAFF DETAILS")

    staff_id = ask_text("\nEnter the staff ID to edit: ")
    staff_list = read_records(staff_file())
    staff = find_staff_by_id(staff_list, staff_id)

    if staff is None:
        show_message("No staff member found with that ID.")
        pause()
        return

    working_copy = list(staff)

    while True:
        show_header("EDIT STAFF - %s" % working_copy[staff_pos("name")])
        display_staff_table([working_copy])

        print("\n  1. Name")
        print("  2. Email")
        print("  3. Reset password")
        print("  0. Save and return")

        choice = ask_choice("\nSelect the field to edit: ",
                            ["0", "1", "2", "3"])

        if choice == "0":
            break
        elif choice == "1":
            working_copy[staff_pos("name")] = ask_text(
                "New name        : ", 2, allow_digits=False)
        elif choice == "2":
            admins = read_records(admin_file())
            all_staff = read_records(staff_file())
            customers = read_records(customer_file())
            working_copy[staff_pos("email")] = ask_email(
                "New email       : ",
                all_emails(admins, all_staff, customers),
                staff[staff_pos("email")])
        elif choice == "3":
            working_copy[staff_pos("password")] = ask_password(
                "New password    : ")

        show_message("Field updated. Remember to save before returning.")
        pause()

    all_staff = read_records(staff_file())
    for position in range(len(all_staff)):
        if all_staff[position][staff_pos("id")] == working_copy[staff_pos("id")]:
            all_staff[position] = working_copy
    write_records(staff_file(), all_staff)

    show_message("Staff details have been saved.")
    pause()


def create_staff_account():
    """Allow an admin to create a new administrative staff account."""
    show_header("CREATE STAFF ACCOUNT")

    staff_list = read_records(staff_file())
    highest = 0
    for staff in staff_list:
        identifier = staff[staff_pos("id")]
        if identifier.startswith("S") and identifier[1:].isdigit():
            number = int(identifier[1:])
            if number > highest:
                highest = number
    new_id = "S" + str(highest + 1).zfill(3)

    print("\nThe system has assigned the staff ID: %s" % new_id)

    name = ask_text("\nFull name : ", 2, allow_digits=False)
    admins = read_records(admin_file())
    customers = read_records(customer_file())
    email = ask_email("Email     : ", all_emails(admins, staff_list, customers))
    password = ask_password("Password  : ")

    new_staff = [new_id, name, email, password]

    if ask_yes_no("\nSave this staff account?"):
        append_record(staff_file(), new_staff)
        show_message("Staff account %s created successfully." % new_id)
    else:
        show_message("The record was discarded. Nothing was saved.")

    pause()


# ===========================================================================
# SECTION 12 - ROLE MENUS
# ===========================================================================

def admin_menu(current_admin):
    """
    Display and operate the Admin menu.

    An Admin has the widest authority: creating staff accounts, viewing and
    searching every staff and customer record, generating any customer's
    statement, editing staff details and changing their own password.
    """
    while True:
        show_header("ADMIN MENU - %s (%s)"
                    % (current_admin[admin_pos("name")],
                       current_admin[admin_pos("id")]))

        print("\n   1. Create administrative staff account")
        print("   2. View all staff and customers")
        print("   3. Search staff or customers")
        print("   4. Generate a customer's statement of account")
        print("   5. Edit staff details")
        print("   6. Change my password")
        print("   0. Log out")

        choice = ask_choice("\nSelect an option (0-6): ",
                            [str(number) for number in range(0, 7)])

        if choice == "1":
            create_staff_account()
        elif choice == "2":
            show_header("ALL STAFF AND CUSTOMERS")
            display_staff_table(read_records(staff_file()), "STAFF")
            display_customer_table(read_records(customer_file()),
                                   "\nCUSTOMERS")
            pause()
        elif choice == "3":
            admin_search_menu()
        elif choice == "4":
            staff_print_statement_for_any_customer()
        elif choice == "5":
            edit_staff_details(current_admin)
        elif choice == "6":
            current_admin = reset_own_password(
                read_records(admin_file()), admin_file(), admin_pos,
                current_admin)
        elif choice == "0":
            show_message("You have been logged out.")
            pause()
            break


def admin_search_menu():
    """Let an admin choose whether to search staff or customer records."""
    show_header("SEARCH STAFF OR CUSTOMERS")

    print("\n  1. Search staff by ID or email")
    print("  2. Search customers by account number or email")
    print("  0. Cancel")

    choice = ask_choice("\nSelect an option (0-2): ", ["0", "1", "2"])

    if choice == "1":
        field_name = ask_choice(
            "\nSearch by (id/email): ", ["id", "email"])
        search_value = ask_text("Enter the %s to search for: " % field_name)
        staff_list = read_records(staff_file())
        matches = find_matches(staff_list, staff_pos(field_name),
                               search_value)
        display_staff_table(matches, "SEARCH RESULTS")
        pause()
    elif choice == "2":
        search_customers("SEARCH CUSTOMERS")


def staff_menu(current_staff):
    """
    Display and operate the administrative Staff menu.

    Staff register new customers, edit customer details other than the
    account number and name, generate statements, and view or search
    customers.
    """
    while True:
        show_header("STAFF MENU - %s (%s)"
                    % (current_staff[staff_pos("name")],
                       current_staff[staff_pos("id")]))

        print("\n   1. Register a new customer")
        print("   2. Edit customer details")
        print("   3. Generate a customer's statement of account")
        print("   4. View all customers")
        print("   5. Search customers")
        print("   6. Change my password")
        print("   0. Log out")

        choice = ask_choice("\nSelect an option (0-6): ",
                            [str(number) for number in range(0, 7)])

        if choice == "1":
            register_customer()
        elif choice == "2":
            edit_customer_details()
        elif choice == "3":
            staff_print_statement_for_any_customer()
        elif choice == "4":
            view_all_customers("ALL CUSTOMERS")
        elif choice == "5":
            search_customers("SEARCH CUSTOMERS")
        elif choice == "6":
            current_staff = reset_own_password(
                read_records(staff_file()), staff_file(), staff_pos,
                current_staff)
        elif choice == "0":
            show_message("You have been logged out.")
            pause()
            break


def customer_menu(current_customer):
    """
    Display and operate the Customer menu.

    A Customer may change their password, deposit, withdraw, view their own
    account details, and print their own statement of account.
    """
    while True:
        show_header("CUSTOMER MENU - %s (%s)"
                    % (current_customer[cust_pos("name")],
                       current_customer[cust_pos("account_number")]))

        print("\n  1. View my account details")
        print("  2. Deposit")
        print("  3. Withdraw")
        print("  4. Print my statement of account")
        print("  5. Change my password")
        print("  0. Log out")

        choice = ask_choice("\nSelect an option (0-5): ",
                            [str(number) for number in range(0, 6)])

        if choice == "1":
            show_header("MY ACCOUNT DETAILS")
            display_customer_profile(current_customer)
            pause()
        elif choice == "2":
            current_customer = deposit(current_customer)
        elif choice == "3":
            current_customer = withdraw(current_customer)
        elif choice == "4":
            print_statement(current_customer[cust_pos("account_number")],
                            current_customer[cust_pos("name")])
        elif choice == "5":
            current_customer = reset_own_password(
                read_records(customer_file()), customer_file(), cust_pos,
                current_customer)
        elif choice == "0":
            show_message("You have been logged out.")
            pause()
            break


# ===========================================================================
# SECTION 13 - PROGRAM ENTRY POINT
# ===========================================================================

def main_menu():
    """
    Display the opening screen and return the role the user selected.

    Returning a role name rather than acting directly keeps this function
    responsible for one task only, in line with modular design.
    """
    show_header("BANKING SERVICE SYSTEM")

    print("\n  1. Admin login")
    print("  2. Staff login")
    print("  3. Customer login")
    print("  0. Exit the system")

    choice = ask_choice("\nSelect an option (0-3): ", ["0", "1", "2", "3"])
    return {"1": "Admin", "2": "Staff", "3": "Customer", "0": ""}[choice]


def main():
    """
    Run the Banking Service System.

    The loop allows successive users to sign in, but a user who fails to log
    in three times causes the whole program to terminate, as the brief
    requires.
    """
    ensure_data_files()

    while True:
        selected_role = main_menu()

        if selected_role == "":
            show_header("GOODBYE")
            print("\nThank you for using the Banking Service System.\n")
            break

        if selected_role == "Admin":
            current_user = login("Admin", "Admin ID", authenticate_admin)
            if current_user is None:
                terminate_system()
                break
            admin_menu(current_user)
        elif selected_role == "Staff":
            current_user = login("Staff", "Staff ID", authenticate_staff)
            if current_user is None:
                terminate_system()
                break
            staff_menu(current_user)
        elif selected_role == "Customer":
            current_user = login("Customer", "Account Number",
                                 authenticate_customer)
            if current_user is None:
                terminate_system()
                break
            customer_menu(current_user)


# The program starts here.
main()
