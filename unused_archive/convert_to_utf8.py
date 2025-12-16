
import os
import codecs

def convert_csv_to_utf8(directory):
    for filename in os.listdir(directory):
        if filename.endswith('.csv'):
            filepath = os.path.join(directory, filename)
            try:
                # Try reading with CP949 first, then EUC-KR if CP949 fails
                try:
                    with codecs.open(filepath, 'r', encoding='cp949') as f:
                        content = f.read()
                    with codecs.open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Successfully converted {filename} from CP949 to UTF-8")
                except UnicodeDecodeError:
                    try:
                        with codecs.open(filepath, 'r', encoding='euc-kr') as f:
                            content = f.read()
                        with codecs.open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Successfully converted {filename} from EUC-KR to UTF-8")
                    except Exception as e:
                        print(f"Could not convert {filename} (neither CP949 nor EUC-KR worked): {e}")
                except Exception as e:
                    print(f"Error processing {filename}: {e}")
            except Exception as e:
                print(f"Error opening or processing {filename}: {e}")

if __name__ == "__main__":
    data_dir = "public/data"
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} does not exist.")
    else:
        convert_csv_to_utf8(data_dir)
