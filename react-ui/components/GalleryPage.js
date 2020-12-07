import { React, useEffect, useState, useContext } from 'https://unpkg.com/es-react@16.13.1/dev';
import CardSize from '../constants/CardSize.js'
import Booth from "../components/Booth.js";
import htm from '/web_modules/htm.js';
import ActionTypes from '../constants/ActionTypes.js';
import css from '../web_modules/csz.js';
const styles = css`/components/CreatorsPage.css`
import { Context } from '../constants/Context.js';

const html = htm.bind(React.createElement)

const CreatorsPage = () => {
  const { state, dispatch } = useContext(Context);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    console.log("Rendering gallery");
    dispatch({ type: ActionTypes.GetBooths, payload: { page: currentPage } });
  }, [])

  return html`
    <${React.Suspense} fallback=${html`<div>Loading...</div>`}>
    ${state.booths[currentPage] && html`
    <div className="${styles}">
      ${state.booths[currentPage].map(asset => html`
      <${Booth} key=${asset} data=${asset} cardSize=${CardSize.Small} />
      `)}
      </div>
      `}
    <//>

    `;
};

export default CreatorsPage;
