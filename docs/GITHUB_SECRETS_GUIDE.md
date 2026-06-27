# 🔑 GitHub Secrets Configuration Guide

To enable Android signing and GitLab publishing, you must configure the following Secrets in your GitHub repository (**Settings > Secrets and variables > Actions > New repository secret**).

---

## 📋 Required Secrets Reference

| Secret Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | Secret | Base64 encoded string of your release `.keystore` or `.jks` file. | *(See below for generation command)* |
| `KEYSTORE_PASSWORD` | Secret | The password for your keystore. | `my_secure_keystore_pass` |
| `KEY_ALIAS` | Secret | The alias of the signing key. | `vaultx-key-alias` |
| `KEY_PASSWORD` | Secret | The password for the specific key alias. | `my_secure_key_pass` |
| `GITLAB_PAT` | Secret | GitLab Personal Access Token with `api` and `write_repository` scopes. | `glpat-e-fivaki8dWCVI...` |
| `GITLAB_PROJECT_ID` | Secret | The numerical GitLab Project ID for your `fdroiddata` fork. | `1127607136` |
| `GITLAB_API_URL` | Variable | *(Optional)* The base GitLab API URL. Defaults to `https://gitlab.com/api/v4`. | `https://gitlab.example.com/api/v4` |

---

## 🛠️ How to Generate `ANDROID_KEYSTORE_BASE64`

Since you cannot upload binary files directly as secrets, you must convert your `.keystore` file into a Base64-encoded text string.

### On macOS / Linux (Terminal)
Run the following command:
```bash
openssl base64 -in my-release-key.keystore -out keystore-base64.txt
```
Copy the contents of `keystore-base64.txt` and paste it into the value field for `ANDROID_KEYSTORE_BASE64` in GitHub.

### On Windows (PowerShell)
Run the following command:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("my-release-key.keystore")) | Out-File -FilePath keystore-base64.txt
```
Copy the contents of `keystore-base64.txt` and paste it into the value field for `ANDROID_KEYSTORE_BASE64` in GitHub.

---

## 🔒 Security Best Practices
*   Never share your Base64 keystore text or passwords.
*   The CD runner will automatically decode, use, and securely wipe the decoded `release.keystore` file immediately after building the binaries.
*   Once configured, secrets are fully masked in all GitHub Actions console logs.
