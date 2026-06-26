import os
import argparse

def extract_all_code(directory, output_file="all_code.txt"):
    """
    Reads all code files in the given directory and combines them into a single text file.
    Ignores common binary files, hidden folders, and virtual environments.
    """
    # Folders to ignore so we don't extract useless or massive files
    ignore_dirs = {'.git', '.venv', 'venv', 'node_modules', '__pycache__', '.idea', '.vscode', '.next', 'evidence_vault'}
    
    # Common non-text file extensions to ignore
    ignore_exts = {
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.mp4', '.mp3', 
        '.zip', '.tar', '.gz', '.pdf', '.exe', '.dll', '.so', '.pyc', '.pkl'
    }

    # Specific files to ignore (like lock files or API keys)
    ignore_files = {'package-lock.json', 'yarn.lock', '.env', '.env.local'}

    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' not found.")
        return

    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Walk through all folders and files in the directory
        for root, dirs, files in os.walk(directory):
            # Exclude ignored directories from the search
            dirs[:] = [d for d in dirs if d not in ignore_dirs]

            for file in files:
                if file in ignore_files:
                    continue
                    
                ext = os.path.splitext(file)[1].lower()
                if ext in ignore_exts:
                    continue
                
                # Make sure we don't try to extract the output file into itself
                if file == output_file:
                    continue

                filepath = os.path.join(root, file)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                        # Write a highly organized header for each file
                        outfile.write("=" * 80 + "\n")
                        outfile.write(f"File: {filepath}\n")
                        outfile.write("=" * 80 + "\n\n")
                        
                        # Write the actual file content
                        outfile.write(content)
                        outfile.write("\n\n")
                        
                except Exception as e:
                    # Catch errors for files that might not be plain text but don't have standard extensions
                    print(f"Skipping {filepath} (Error reading as text)")

    print(f"Successfully extracted all code into '{output_file}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Combine all code files in a directory into a single text file.")
    parser.add_argument("directory", nargs="?", default=".", help="The directory to scan (defaults to current folder).")
    parser.add_argument("-o", "--output", default="all_code.txt", help="The output file name (defaults to all_code.txt).")
    
    args = parser.parse_args()
    
    extract_all_code(args.directory, args.output)
