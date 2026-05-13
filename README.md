# Home Library

Web application for cataloguing and managing a home book collection. Add books by scanning their ISBN barcode with a phone camera — metadata is automatically fetched from the Hungarian National Library (OSZK) database. Browse, search, and manage the full collection from any device.

## How it works

### Adding books — best done on mobile

Point your phone camera at the barcode on the back of a book. The app looks up the ISBN in the OSZK Nektár database and fills in the title, author, publisher, publication year, and other details automatically. If the book isn't found, all fields can be filled in manually.

**Tip for the description field:** photograph the back cover or inner blurb, let your phone's gallery AI recognise the text, copy it, and paste it directly into the description field.

### Browsing and managing — best done on desktop

The full collection is displayed in a searchable, sortable table. Click any row to open the book's detail panel. From there you can edit details, change the book's storage location or lending status, or remove it from the collection.

## Features

- **ISBN lookup** — automatic metadata from the OSZK Nektár Z39.50 service
- **Location tracking** — assign each book to a room and shelf
- **Status tracking** — At home / Loaned out
- **Search & filter** — by title, author, ISBN, category, language, publication year, location, and status
- **Role-based access** — Admin (full edit access) and Visitor (read-only) roles
- **Loan management** — track borrowers and due dates *(planned)*
- **User management** *(planned)*
- **Profile & account settings** *(planned)*
- **Dark mode & colour themes**
- **Hungarian / English interface**

## OSZK Nektár service

ISBN lookups use the [Hungarian National Library (OSZK)](https://oszk.hu/) Nektár Z39.50 service. The search is unavailable during scheduled maintenance or outages.

- News and maintenance announcements: [oszk.hu](https://oszk.hu/)
- Manual service status check: [nektar1.oszk.hu/librivision_hun.html](https://nektar1.oszk.hu/librivision_hun.html)

## API Documentation

|              | URL                        |
|--------------|----------------------------|
| Swagger UI   | {BASE_URL}/swagger-ui.html |
| OpenAPI JSON | {BASE_URL}/v3/api-docs     |

## License

[PolyForm Personal Use 1.0.0](LICENSE) — free for personal, non-commercial use.  
Third-party library attributions: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)
