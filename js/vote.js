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

window.addEventListener('load', async () => {
  $("#loader").show();

  client = await Ae.Aepp();

  const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledGet = await contract.call('getQuotesLength', [], {callStatic: true}).catch(e => console.error(e));
  console.log('calledGet', calledGet);

  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  console.log('decodedGet', decodedGet);

  renderQuotes();

  $("#loader").hide();
});

jQuery("#quoteBody").on("click", ".voteBtn", async function(event){
  const value = $(this).siblings('input').val();
  const dataIndex = event.target.id;
  const foundIndex = quoteArray.findIndex(quote => quote.index == dataIndex);
  quoteArray[foundIndex].votes += parseInt(value, 10);
  renderQuotes();
});

$('#registerBtn').click(async function(){
  var name = ($('#regName').val()),
      url = ($('#regUrl').val());

  quoteArray.push({
    creatorName: name,
    quoteUrl: url,
    index: quoteArray.length+1,
    votes: 0
  })

  renderQuotes();
});