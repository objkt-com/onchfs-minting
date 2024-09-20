# OnchainFS Collections

This project aims to allow users to mint on-chain artifacts using fxhash's [onchfs](https://github.com/fxhash/onchfs). This allows storing on-chain files (images, videos, etc.) that are larger than the single transaction limit. The code is written specifically for the objkt SA+OE contract, so you can use this for open editions as well as limited editions. The code can be adapted to work with any contract that allows storing token metadata with a string: bytes map.

## Features

- Connect to Tezos wallet
- View and select objkt SA+OE editions
- Mint NFTs with customizable attributes
- Switch between Ghostnet and Mainnet networks

## Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Available Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

For more information about Tezos and OnchainFS, refer to their respective documentation:
- [Tezos Documentation](https://tezos.com/developer-portal/)
- [OnchainFS Documentation](https://github.com/marigold-dev/onchainfs)
