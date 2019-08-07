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
    entrypoint get_quote(index : int) : quote =
      switch(Map.lookup(index, state.quotes))
        None    => abort("There was no quote with this index registered.")
        Some(x) => x
    stateful entrypoint register_quote(url' : string, name' : string) =
      let quote = { creatorAddress = Call.caller, url = url', name = name', voteCount = 0}
      let index = get_quotes_length() + 1
      put(state{ quotes[index] = quote, quotesLength = index })
    entrypoint get_quotes_length() : int =
      state.quotesLength
    stateful entrypoint vote_quote(index : int) =
      let quote = get_quote(index)
      Chain.spend(quote.creatorAddress, Call.value)
      let updatedVoteCount = quote.voteCount + Call.value
      let updatedQuotes = state.quotes{ [index].voteCount = updatedVoteCount }
      put(state{ quotes = updatedQuotes })
`;
const contractAddress ='ct_2skaExvrzNyHMHqiTf4khAZDE7RjLZpHgaRGH7PjwkpEbq69Vp';
var client = null;
var quoteArray = [];
var quotesLength = 0;

function renderQuotes() {
  quoteArray = quoteArray.sort(function(a,b){return b.votes-a.votes})
  var template = $('#template').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {quoteArray});
  $('#quoteBody').html(rendered);
}

async function callStatic(func, args) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  console.log('Functions: ', func);
  console.log('Arguments: ', args);
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  console.log('calledGet: ', calledGet);
  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  return decodedGet;
}

async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));
  return calledSet;
}

window.addEventListener('load', async () => {
  $("#loader").show();

  client = await Ae.Aepp();

  quotesLength = await callStatic('get_quotes_length', []);

  for (let i = 1; i <= quotesLength; i++) {

    const quote = await callStatic('get_quote', [i]);

    quoteArray.push({
      creatorName: quote.name,
      quoteUrl: quote.url,
      index: i,
      votes: quote.quoteCount,
    })
  }

  renderQuotes();

  $("#loader").hide();
});

jQuery("#quoteBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();
  const value = $(this).siblings('input').val();
  const dataIndex = event.target.id;

  await contractCall('vote_quote', [dataIndex], value);

  const foundIndex = quoteArray.findIndex(quote => quote.index == dataIndex);
  console.log(foundIndex);
  quoteArray[foundIndex].votes += parseInt(value, 10);
  renderQuotes();
  $("#loader").hide();
});

$('#registerBtn').click(async function(){
  $("#loader").show();
  let name = ($('#regName').val()),
      url = ($('#regUrl').val());

  await contractCall('register_quote', [url, name], 0);

  quoteArray.push({
    creatorName: name,
    quoteUrl: url,
    index: quoteArray.length+1,
    votes: 0
  })

  renderQuotes();
  $("#loader").hide();
});
