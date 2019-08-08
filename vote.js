const contractSource = `
contract QuoteVote =
    record quote =
    { creatorAddress : address,
        url            : string,
        name           : string,
        voteCount      : int }
    record state =
    { quotes      : map(int, quote),
        quotesLength : int }
    entrypoint init() =
    { quotes = {},
        quotesLength = 0 }
    entrypoint getQuote(index : int) : quote =
    switch(Map.lookup(index, state.quotes))
        None    => abort("There was no quote with this index registered.")
        Some(x) => x
    stateful entrypoint registerQuote(url' : string, name' : string) =
    let quote = { creatorAddress = Call.caller, url = url', name = name', voteCount = 0}
    let index = getQuotesLength() + 1
    put(state{ quotes[index] = quote, quotesLength = index })
    entrypoint getQuotesLength() : int =
    state.quotesLength
    stateful entrypoint voteQuote(index : int) =
    let quote = getQuote(index)
    Chain.spend(quote.creatorAddress, Call.value)
    let updatedVoteCount = quote.voteCount + Call.value
    let updatedQuotes = state.quotes{ [index].voteCount = updatedVoteCount }
    put(state{ quotes = updatedQuotes })
`;

//Address of the meme voting smart contract on the testnet of the aeternity blockchain
const contractAddress = 'ct_2PCQNNwuDqaVn4SY8MuW9NzYYAxkRaxi5DVFsmpBTvZrYv6JKW';
//Create variable for client so it can be used in different functions
var client = null;
//Create a new global array for the memes
var quoteArray = [];
//Create a new variable to store the length of the meme globally
var quotesLength = 0;

function renderQuotes() {
  //Order the memes array so that the meme with the most votes is on top
  quoteArray = quoteArray.sort(function(a,b){return b.votes-a.votes})
  //Get the template we created in a block scoped variable
  let template = $('#template').html();
  //Use mustache parse function to speeds up on future uses
  Mustache.parse(template);
  //Create variable with result of render func form template and data
  let rendered = Mustache.render(template, {quoteArray});
  //Use jquery to add the result of the rendering to our html
  $('#quoteBody').html(rendered);
}

//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to get data of smart contract func, with specefied arguments
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  //Make another call to decode the data received in first call
  const decodedGet = await calledGet.decode().catch(e => console.error(e));

  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

  return calledSet;
}

//Execute main function
window.addEventListener('load', async () => {
  //Display the loader animation so the user knows that something is happening
  $("#loader").show();

  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.
  client = await Ae.Aepp();

  //First make a call to get to know how may memes have been created and need to be displayed
  //Assign the value of meme length to the global variable
  quotesLength = await callStatic('getQuotesLength', []);

  //Loop over every meme to get all their relevant information
  for (let i = 1; i <= quotesLength; i++) {

    //Make the call to the blockchain to get all relevant information on the meme
    const quote = await callStatic('getQuote', [i]);

    //Create meme object with  info from the call and push into the array with all memes
    quoteArray.push({
      creatorName: quote.name,
      quoteUrl: quote.url,
      index: i,
      votes: quote.voteCount,
    })
  }

  //Display updated memes
  renderQuotes();

  //Hide loader animation
  $("#loader").hide();
});

//If someone clicks to vote on a meme, get the input and execute the voteCall
jQuery("#quoteBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();
  //Create two new let block scoped variables, value for the vote input and
  //index to get the index of the meme on which the user wants to vote
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  //Promise to execute execute call for the vote meme function with let values
  await contractCall('voteQuote', [index], value);

  //Hide the loading animation after async calls return a value
  const foundIndex = quoteArray.findIndex(quote => quote.index == event.target.id);
  //console.log(foundIndex);
  quoteArray[foundIndex].votes += parseInt(value, 10);

  renderQuotes();
  $("#loader").hide();
});

//If someone clicks to register a meme, get the input and execute the registerCall
$('#registerBtn').click(async function(){
  $("#loader").show();
  //Create two new let variables which get the values from the input fields
  const name = ($('#regName').val()),
        url = ($('#regUrl').val());

  //Make the contract call to register the meme with the newly passed values
  await contractCall('registerQuote', [url, name], 0);

  //Add the new created memeobject to our memearray
  quoteArray.push({
    creatorName: name,
    quoteUrl: url,
    index: quoteArray.length+1,
    votes: 0,
  })

  renderQuotes();
  $("#loader").hide();
});