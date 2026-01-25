# Product Image Setup

Place your product image in this directory with the name: `onepiece.jpg`

## Image Requirements
- **File name**: onepiece.jpg
- **Recommended size**: 400x400 pixels or larger
- **Format**: JPG, PNG
- **Aspect ratio**: Square (1:1) works best

## Alternative
If you want to use a different image:
1. Place your image in this directory
2. Update the image path in `ca2App/app.js`:
   ```javascript
   const sampleProduct = {
       name: "One Piece The Monsters",
       price: 150,
       imageUrl: "/images/your-image-name.jpg",  // ← Change this
       description: "Limited edition collectible"
   };
   ```

## No Image?
If you don't have an image, the application will still work. The image area will simply not display, but all blockchain functionality will work normally.
