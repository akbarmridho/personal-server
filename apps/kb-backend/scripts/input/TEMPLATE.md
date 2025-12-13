---
# REQUIRED FIELDS
title: "Document Title Here"
date: "2025-12-13"
type: "analysis" 

# REQUIRED SOURCE OBJECT
source:
  name: "source-name-slug"
  url: "https://example.com/source.pdf"

# OPTIONAL FIELDS
id: "custom-id-override" # If omitted, filename is used
urls: 
  - "https://supporting-link-1.com"
  - "https://supporting-link-2.com"
---

## Content Section

Write your markdown content here. You can use:

- Bullet points
- **Bold text**
- [Links](https://google.com)

Everything below the second "---" separator is treated as the document content.
